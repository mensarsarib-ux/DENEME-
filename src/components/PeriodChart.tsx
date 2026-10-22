import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import type { Period, Transaction } from "../data/mock";
import { money } from "../lib/format";
import { buildSeries } from "../lib/series";

const PERIODS: { value: Period; label: string }[] = [
  { value: "daily", label: "Günlük" },
  { value: "weekly", label: "Haftalık" },
  { value: "monthly", label: "Aylık" },
  { value: "yearly", label: "Yıllık" },
];

/** Bir çubuğun yüksekliği (yüzde); küçük de olsa sıfırdan büyük değer görünür kalır */
const barHeight = (value: number, max: number) =>
  `${value > 0 ? Math.max((value / max) * 100, 3) : 0}%`;

/**
 * Dönem seçiciye göre gelir ve gider grafiği.
 * Günlük: haftanın günleri, haftalık: son 4 hafta, aylık: son 6 ay (kaydırınca önceki 6 ay),
 * yıllık: son 5 yıl. Bir gruba dokununca tutarları üstte yazılır.
 */
export default function PeriodChart({
  transactions,
}: {
  transactions: Transaction[];
}) {
  const [period, setPeriod] = useState<Period>("monthly");
  // null: içinde bulunulan gün/hafta/ay/yıl seçili
  const [picked, setPicked] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const series = buildSeries(transactions, period);
  const selectedIndex = picked ?? series.currentIndex;
  const selected = series.points[selectedIndex];
  const max = Math.max(
    ...series.points.flatMap((p) => [p.gelir, p.gider]),
    1,
  );

  // Çok grup varsa en yeni gruplar sağda görünsün; eskilere kaydırılarak ulaşılır
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [period]);

  function changePeriod(next: Period) {
    setPeriod(next);
    setPicked(null);
  }

  return (
    <div className="chart-card period-card">
      <div className="chart-head">
        <div className="segmented" role="tablist" aria-label="Dönem">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              role="tab"
              aria-selected={period === p.value}
              className={period === p.value ? "is-active" : ""}
              onClick={() => changePeriod(p.value)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="series-detail" aria-live="polite">
        <span className="series-title">{selected.title}</span>
        <span className="series-values">
          <span className="series-value is-in">{money.format(selected.gelir)}</span>
          <span className="series-value is-out">{money.format(selected.gider)}</span>
        </span>
      </div>

      <div className="series-scroll" ref={scrollRef}>
        <div className="series">
          {series.points.map((p, i) => (
            <button
              key={p.key}
              type="button"
              className={`series-group ${i === selectedIndex ? "is-selected" : ""} ${i === series.currentIndex ? "is-current" : ""}`}
              style={{ flexBasis: `${100 / series.visible}%` } as CSSProperties}
              aria-pressed={i === selectedIndex}
              aria-label={`${p.title}: gelir ${money.format(p.gelir)}, gider ${money.format(p.gider)}`}
              onClick={() => setPicked(i)}
            >
              <span className="series-bars">
                <span
                  className="series-bar is-in"
                  style={{ height: barHeight(p.gelir, max) }}
                />
                <span
                  className="series-bar is-out"
                  style={{ height: barHeight(p.gider, max) }}
                />
              </span>
              <span className="series-label">{p.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
