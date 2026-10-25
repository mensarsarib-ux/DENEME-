import { totalsBetween, type Transaction } from "../data/mock";
import { money } from "../lib/format";
import { locale, t } from "../lib/i18n";

const MONTHS = 6;

/** Son altı ayın gelir (satış) ve gider (alış) sütunları. Renkler gelir/gider grafiğiyle aynı, yarı saydam. */
export default function ColumnChart({ transactions }: { transactions: Transaction[] }) {
  const now = new Date();
  const months = Array.from({ length: MONTHS }, (_, i) => {
    const offset = i - (MONTHS - 1);
    const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 1);
    const { satis, alis } = totalsBetween(transactions, [start, end]);
    return { label: start.toLocaleDateString(locale(), { month: "short" }), gelir: satis, gider: alis };
  });
  const max = Math.max(1, ...months.flatMap((m) => [m.gelir, m.gider]));
  const current = months[months.length - 1];

  return (
    <section className="card col-chart" aria-label={t("Aylık gelir ve gider")}>
      <div className="col-head">
        <span className="card-title">{t("AYLIK GELİR · GİDER")}</span>
        <span className="col-legend">
          <i className="col-dot in" /> {t("Gelir")} <i className="col-dot out" /> {t("Gider")}
        </span>
      </div>
      <div className="col-plot">
        {months.map((m, i) => (
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
      <p className="col-note">{t("Bu ay gelir {g}", { g: money.format(current.gelir) })}</p>
    </section>
  );
}
