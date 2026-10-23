import { useRef, useState } from "react";
import { totalsBetween, type Period, type Transaction } from "../data/mock";
import { money } from "../lib/format";
import { haptic } from "../lib/haptics";
import { modeLabel, rangeOf, titleOf, type RangeMode } from "../lib/ranges";
import { useLongPress } from "../lib/useLongPress";
import PeriodSheet from "./PeriodSheet";
import { t } from "../lib/i18n";

/** Gelir ya da gider satırı: etiket, tutar ve orantılı çubuk */
function FlowRow({
  label,
  value,
  max,
  tone,
}: {
  label: string;
  value: number;
  max: number;
  tone: "in" | "out";
}) {
  // Sıfır olsa bile küçük bir çıkıntı kalır, çubuk görünür olur
  const width = Math.max((value / max) * 100, 1.5);
  return (
    <div className={`flow-row flow-${tone}`}>
      <div className="flow-row-top">
        <span className="flow-label">{label}</span>
        <span className="flow-amount">{money.format(value)}</span>
      </div>
      <div className="flow-track">
        <div className="flow-fill" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

type Sheet = "menu" | "custom" | null;

/**
 * Gelir ve gider grafiği: gelir = satış toplamı, gider = alış toplamı, net = gelir − gider.
 * Varsayılan aylıktır. Üzerine basılı tutunca günlük, haftalık, aylık, yıllık veya özel tarih aralığı seçilir.
 */
export default function FlowChart({
  transactions,
}: {
  transactions: Transaction[];
}) {
  const [mode, setMode] = useState<RangeMode>("monthly");
  // 0: şimdiki dönem, -1: bir önceki dönem, ...
  const [offset, setOffset] = useState(0);
  const [custom, setCustom] = useState<[Date, Date] | null>(null);
  const [sheet, setSheet] = useState<Sheet>(null);
  const openedAt = useRef(0);

  const { handlers, pressing } = useLongPress(() => {
    openedAt.current = Date.now();
    setSheet("menu");
  });

  const range = rangeOf(mode, offset, custom);
  const { satis: gelir, alis: gider } = totalsBetween(transactions, range);
  const net = gelir - gider;
  const max = Math.max(gelir, gider, 1);
  const title = titleOf(mode, range);

  const note =
    gelir > 0
      ? t("Gider / gelir: %{n}", { n: Math.round((gider / gelir) * 100) })
      : gider > 0
        ? t("Bu dönemde gelir yok.")
        : t("Bu dönemde işlem yok.");

  function choosePeriod(next: Period) {
    haptic("light");
    setMode(next);
    setOffset(0);
    setSheet(null);
  }

  return (
    <>
      <div
        className={`chart-card month-card ${pressing ? "is-pressing" : ""}`}
        title={t("Dönemi değiştirmek için basılı tutun")}
        {...handlers}
      >
        <div className="month-head">
          <div className="month-title-block">
            <span className="month-mode">{modeLabel(mode)}</span>
            <div className="month-nav">
              {mode !== "custom" && (
                <button
                  type="button"
                  aria-label={t("Önceki dönem")}
                  onClick={() => setOffset((o) => o - 1)}
                >
                  ‹
                </button>
              )}
              <span className="month-title">{title}</span>
              {mode !== "custom" && (
                <button
                  type="button"
                  aria-label={t("Sonraki dönem")}
                  disabled={offset === 0}
                  onClick={() => setOffset((o) => Math.min(o + 1, 0))}
                >
                  ›
                </button>
              )}
            </div>
          </div>
          <div className="month-net">
            <span className="month-net-label">{t("NET")}</span>
            <strong className={net < 0 ? "is-loss" : ""}>{money.format(net)}</strong>
          </div>
        </div>

        <div className="flow-rows">
          <FlowRow label={t("GELİR")} value={gelir} max={max} tone="in" />
          <FlowRow label={t("GİDER")} value={gider} max={max} tone="out" />
        </div>

        <p className="month-note">{note}</p>
      </div>

      <PeriodSheet
        open={sheet !== null}
        mode={mode}
        custom={custom}
        onClose={() => setSheet(null)}
        onChoose={choosePeriod}
        onCustom={(range) => {
          setCustom(range);
          setMode("custom");
          setOffset(0);
          setSheet(null);
        }}
      />
    </>
  );
}
