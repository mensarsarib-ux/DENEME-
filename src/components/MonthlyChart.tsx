import { useState } from "react";
import { monthRange, totalsBetween, type Transaction } from "../data/mock";
import { money } from "../lib/format";

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

/** Aylık gelir ve gider: gelir = satış toplamı, gider = alış toplamı, net = gelir − gider */
export default function MonthlyChart({
  transactions,
}: {
  transactions: Transaction[];
}) {
  // 0: bu ay, -1: geçen ay, ...
  const [offset, setOffset] = useState(0);
  const range = monthRange(offset);
  const { satis: gelir, alis: gider } = totalsBetween(transactions, range);
  const net = gelir - gider;
  const max = Math.max(gelir, gider, 1);

  const title = range[0]
    .toLocaleDateString("tr-TR", { month: "long", year: "numeric" })
    .toLocaleUpperCase("tr-TR");

  const note =
    gelir > 0
      ? `Gider / gelir: %${Math.round((gider / gelir) * 100)}`
      : gider > 0
        ? "Bu ay gelir yok."
        : "Bu ayda işlem yok.";

  return (
    <div className="chart-card month-card">
      <div className="month-head">
        <div className="month-nav">
          <button
            type="button"
            aria-label="Önceki ay"
            onClick={() => setOffset((o) => o - 1)}
          >
            ‹
          </button>
          <span className="month-title">{title}</span>
          <button
            type="button"
            aria-label="Sonraki ay"
            disabled={offset === 0}
            onClick={() => setOffset((o) => Math.min(o + 1, 0))}
          >
            ›
          </button>
        </div>
        <div className="month-net">
          <span className="month-net-label">NET</span>
          <strong className={net < 0 ? "is-loss" : ""}>{money.format(net)}</strong>
        </div>
      </div>

      <div className="flow-rows">
        <FlowRow label="GELİR" value={gelir} max={max} tone="in" />
        <FlowRow label="GİDER" value={gider} max={max} tone="out" />
      </div>

      <p className="month-note">{note}</p>
    </div>
  );
}
