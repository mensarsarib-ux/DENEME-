import { useState } from "react";
import { totalsBetween, type Period, type Transaction } from "../data/mock";
import { money } from "../lib/format";
import { haptic } from "../lib/haptics";
import { locale, t } from "../lib/i18n";
import { rangeOf, titleOf, type RangeMode } from "../lib/ranges";
import { useLongPress } from "../lib/useLongPress";
import PeriodSheet from "./PeriodSheet";

/** Gösterilen dilim sayısı: seçilen dönemin sonunda biten altı dilim */
const SLICES = 6;

/**
 * Gelir (satış) ve gider (alış) sütunları. Varsayılan son altı ay; basılı tutunca açılan
 * dönem penceresinden günlük, haftalık, aylık, yıllık ya da özel aralık seçilir ve sütunlar ona göre çizilir.
 * Renkler gelir/gider grafiğiyle aynı, yarı saydam.
 */
export default function ColumnChart({ transactions }: { transactions: Transaction[] }) {
  const [mode, setMode] = useState<RangeMode>("monthly");
  const [custom, setCustom] = useState<[Date, Date] | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const { handlers, pressing } = useLongPress(() => {
    haptic("medium");
    setSheetOpen(true);
  });

  const period = rangeOf(mode, 0, custom);
  const slices = sliceRanges(mode, period, custom);
  const data = slices.map((range) => {
    const { satis, alis } = totalsBetween(transactions, range);
    return { label: labelOf(mode, range[0]), gelir: satis, gider: alis };
  });
  const max = Math.max(1, ...data.flatMap((m) => [m.gelir, m.gider]));
  const { satis: gelir } = totalsBetween(transactions, period);

  function choosePeriod(next: Period) {
    haptic("light");
    setMode(next);
    setCustom(null);
    setSheetOpen(false);
  }

  return (
    <>
    <section
      className={`card col-chart ${pressing ? "is-pressing" : ""}`}
      aria-label={t("Gelir ve gider sütunları")}
      title={t("Dönemi değiştirmek için basılı tutun")}
      {...handlers}
    >
      <div className="col-head">
        <span className="card-title">{t("GELİR · GİDER")}</span>
        <span className="col-legend">
          <i className="col-dot in" /> {t("Gelir")} <i className="col-dot out" /> {t("Gider")}
        </span>
      </div>
      <div className="col-plot">
        {data.map((m, i) => (
          <div
            key={i}
            className="col-group"
            title={`${m.label}: ${money.format(m.gelir)} / ${money.format(m.gider)}`}
          >
            <div className="col-bars">
              <div className="col-bar in" style={{ height: `${(m.gelir / max) * 100}%` }} />
              <div className="col-bar out" style={{ height: `${(m.gider / max) * 100}%` }} />
            </div>
            <span className="col-label">{m.label}</span>
          </div>
        ))}
      </div>
      <p className="col-note">
        {titleOf(mode, period)} · {t("Gelir {g}", { g: money.format(gelir) })}
      </p>

    </section>
    <PeriodSheet
      open={sheetOpen}
      mode={mode}
      custom={custom}
      onClose={() => setSheetOpen(false)}
      onChoose={choosePeriod}
      onCustom={(range) => {
        setCustom(range);
        setMode("custom");
        setSheetOpen(false);
      }}
    />
    </>
  );
}

/** Seçilen dönemin sonunda biten altı dilimin aralıkları */
function sliceRanges(mode: RangeMode, period: [Date, Date], custom: [Date, Date] | null): [Date, Date][] {
  if (mode === "custom" && custom) {
    // Özel aralık eşit altı parçaya bölünür
    const [start, end] = custom;
    const step = (end.getTime() - start.getTime()) / SLICES;
    return Array.from({ length: SLICES }, (_, i) => [
      new Date(start.getTime() + step * i),
      new Date(start.getTime() + step * (i + 1)),
    ]);
  }
  const periodMode = mode as Period;
  return Array.from({ length: SLICES }, (_, i) => rangeOf(periodMode, i - (SLICES - 1), null, period[0]));
}

/** Dilim etiketi: gün ve haftada tarih, ay ve yılda kısa ad */
function labelOf(mode: RangeMode, start: Date): string {
  if (mode === "yearly") return String(start.getFullYear());
  if (mode === "monthly") return start.toLocaleDateString(locale(), { month: "short" });
  return start.toLocaleDateString(locale(), { day: "numeric", month: "short" });
}
