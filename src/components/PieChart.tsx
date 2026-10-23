import { useState } from "react";
import type { Customer, Period, Transaction } from "../data/mock";
import { money } from "../lib/format";
import { haptic } from "../lib/haptics";
import { modeLabel, rangeOf, titleOf, type RangeMode } from "../lib/ranges";
import { useLongPress } from "../lib/useLongPress";
import { t } from "../lib/i18n";
import PeriodSheet from "./PeriodSheet";

/** Dilimlerin renkleri; en büyük dilim ilk renkle başlar */
const COLORS = ["#3c8fd9", "#3fbf82", "#e8c547", "#e4574a", "#9b7fe0", "#5fb8c9"];
const TOP = 5;

interface Slice {
  id: string;
  name: string;
  amount: number;
}

/** Bir daire dilimi yolu (merkez 60,60; yarıçap 60) */
function arcPath(startAngle: number, endAngle: number): string {
  const r = 60;
  const c = 60;
  const point = (a: number) => [c + r * Math.cos(a), c + r * Math.sin(a)];
  const [x1, y1] = point(startAngle);
  const [x2, y2] = point(endAngle);
  const large = endAngle - startAngle > Math.PI ? 1 : 0;
  return `M ${c} ${c} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
}

/**
 * Satış dağılımı pasta grafiği: seçilen dönemde satışların müşterilere göre payı.
 * En büyük beş müşteri ayrı dilim, geri kalanı "Diğer". Basılı tutunca dönem seçilir.
 */
export default function PieChart({
  parties,
  transactions,
}: {
  parties: Customer[];
  transactions: Transaction[];
}) {
  const [mode, setMode] = useState<RangeMode>("monthly");
  const [offset, setOffset] = useState(0);
  const [custom, setCustom] = useState<[Date, Date] | null>(null);
  const [open, setOpen] = useState(false);

  const { handlers, pressing } = useLongPress(() => {
    haptic("medium");
    setOpen(true);
  });

  const range = rangeOf(mode, offset, custom);
  const [start, end] = range;
  const sales = transactions.filter((tx) => {
    const d = new Date(tx.date).getTime();
    return tx.type === "SATIŞ" && d >= start.getTime() && d < end.getTime();
  });
  const total = sales.reduce((s, tx) => s + tx.amount, 0);

  // Müşteri başına satış toplamı, büyükten küçüğe
  const byCustomer = new Map<string, number>();
  for (const tx of sales) byCustomer.set(tx.customerId, (byCustomer.get(tx.customerId) ?? 0) + tx.amount);
  const sorted: Slice[] = [...byCustomer.entries()]
    .map(([id, amount]) => ({ id, amount, name: parties.find((p) => p.id === id)?.name ?? "—" }))
    .sort((a, b) => b.amount - a.amount);
  const top = sorted.slice(0, TOP);
  const rest = sorted.slice(TOP).reduce((s, x) => s + x.amount, 0);
  const slices: Slice[] = rest > 0 ? [...top, { id: "rest", name: t("Diğer"), amount: rest }] : top;

  // Dilimlerin açıları (üstten saat yönünde)
  let angle = -Math.PI / 2;
  const drawn = slices.map((slice, i) => {
    const sweep = total > 0 ? (slice.amount / total) * Math.PI * 2 : 0;
    const from = angle;
    angle += sweep;
    return { ...slice, color: COLORS[i % COLORS.length], from, to: angle, share: total > 0 ? slice.amount / total : 0 };
  });

  return (
    <>
      <div className={`chart-card month-card pie-card ${pressing ? "is-pressing" : ""}`} title={t("Dönemi değiştirmek için basılı tutun")} {...handlers}>
        <div className="month-head">
          <div className="month-title-block">
            <span className="month-mode">{modeLabel(mode)}</span>
            <div className="month-nav">
              {mode !== "custom" && (
                <button type="button" aria-label={t("Önceki dönem")} onClick={() => setOffset((o) => o - 1)}>
                  ‹
                </button>
              )}
              <span className="month-title">{titleOf(mode, range)}</span>
              {mode !== "custom" && (
                <button type="button" aria-label={t("Sonraki dönem")} disabled={offset === 0} onClick={() => setOffset((o) => Math.min(o + 1, 0))}>
                  ›
                </button>
              )}
            </div>
          </div>
          <div className="month-net">
            <span className="month-net-label">{t("SATIŞ")}</span>
            <strong>{money.format(total)}</strong>
          </div>
        </div>

        {total > 0 ? (
          <div className="pie-body">
            <svg className="pie-svg" viewBox="0 0 120 120" role="img" aria-label={t("Satış dağılımı")}>
              {drawn.length === 1 ? (
                <circle cx="60" cy="60" r="60" fill={drawn[0].color} />
              ) : (
                drawn.map((d) => <path key={d.id} d={arcPath(d.from, d.to)} fill={d.color} />)
              )}
            </svg>
            <ul className="pie-legend">
              {drawn.map((d) => (
                <li key={d.id}>
                  <span className="pie-dot" style={{ background: d.color }} aria-hidden="true" />
                  <span className="pie-name">{d.name}</span>
                  <span className="pie-share">%{Math.round(d.share * 100)}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="month-note">{t("Bu dönemde satış yok.")}</p>
        )}
      </div>

      <PeriodSheet
        open={open}
        mode={mode}
        custom={custom}
        onClose={() => setOpen(false)}
        onChoose={(next: Period) => {
          haptic("light");
          setMode(next);
          setOffset(0);
          setOpen(false);
        }}
        onCustom={(r) => {
          setCustom(r);
          setMode("custom");
          setOffset(0);
          setOpen(false);
        }}
      />
    </>
  );
}
