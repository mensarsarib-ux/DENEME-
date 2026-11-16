import { useState } from "react";
import type { Transaction } from "../data/mock";
import { money } from "../lib/format";
import { haptic } from "../lib/haptics";
import { modeLabel, rangeOf, titleOf, type RangeMode } from "../lib/ranges";
import { useLongPress } from "../lib/useLongPress";
import PeriodSheet from "./PeriodSheet";
import { FlowRow } from "./FlowChart";
import { t } from "../lib/i18n";

/**
 * İade ve indirim kartı (ana ekrandaki grafiklerin sonuncusu). Varsayılan yıllıktır; basılı tutunca
 * diğer kartlardaki gibi günlük, haftalık, aylık, yıllık ya da özel tarih aralığı seçilir.
 * Satıştan düşen: bakiyeyi azaltan iade/indirim (müşteriye yapılan). Alıştan düşen: bakiyeyi artıran (bize yapılan).
 */
export default function ReturnsChart({ transactions }: { transactions: Transaction[] }) {
  const [mode, setMode] = useState<RangeMode>("yearly");
  const [offset, setOffset] = useState(0);
  const [custom, setCustom] = useState<[Date, Date] | null>(null);
  const [sheet, setSheet] = useState<"menu" | "custom" | null>(null);

  const { handlers, pressing } = useLongPress(() => setSheet("menu"));

  const range = rangeOf(mode, offset, custom);
  const [start, end] = range;
  let iade = 0;
  let indirim = 0;
  let fromSales = 0;
  let fromPurchases = 0;
  for (const tx of transactions) {
    if (tx.sub !== "İADE" && tx.sub !== "İNDİRİM") continue;
    const at = new Date(tx.date);
    if (at < start || at >= end) continue;
    if (tx.sub === "İADE") iade += tx.amount;
    else indirim += tx.amount;
    if (tx.type === "ALIŞ") fromSales += tx.amount;
    else fromPurchases += tx.amount;
  }
  // Bakiyelere toplam etkisi: satıştan düşenler azaltır, alıştan düşenler artırır
  const net = fromPurchases - fromSales;
  const max = Math.max(iade, indirim, 1);
  const note =
    iade + indirim > 0
      ? t("Satıştan düşen {a} · Alıştan düşen {b}", { a: money.format(fromSales), b: money.format(fromPurchases) })
      : t("Bu dönemde iade ve indirim yok.");

  function choosePeriod(next: RangeMode) {
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
                <button type="button" aria-label={t("Önceki dönem")} onClick={() => setOffset((o) => o - 1)}>
                  ‹
                </button>
              )}
              <span className="month-title">{titleOf(mode, range)}</span>
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
            <span className="month-net-label">{t("NET ETKİ")}</span>
            <strong className={net < 0 ? "is-loss" : ""}>{money.format(net)}</strong>
          </div>
        </div>

        <div className="flow-rows">
          <FlowRow label={t("İADE")} value={iade} max={max} tone="return" />
          <FlowRow label={t("İNDİRİM")} value={indirim} max={max} tone="discount" />
        </div>

        <p className="month-note">{note}</p>
      </div>

      <PeriodSheet
        open={sheet !== null}
        mode={mode}
        custom={custom}
        onClose={() => setSheet(null)}
        onChoose={choosePeriod}
        onCustom={(r) => {
          setCustom(r);
          setMode("custom");
          setOffset(0);
          setSheet(null);
        }}
      />
    </>
  );
}
