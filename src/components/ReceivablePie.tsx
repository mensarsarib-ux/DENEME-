import { balanceOf, type Customer, type Transaction } from "../data/mock";
import { t } from "../lib/i18n";

/** Pasta dilimleri: uygulamanın mavi tonları, yarı saydam (renk düzeniyle uyumlu) */
const SLICES = [
  "rgba(95, 176, 245, 0.95)",
  "rgba(47, 120, 189, 0.9)",
  "rgba(140, 200, 250, 0.8)",
  "rgba(60, 143, 217, 0.7)",
  "rgba(35, 90, 150, 0.8)",
];
const OTHER = "rgba(255, 255, 255, 0.16)";
const TOP = 5;

/** SVG dilim yolu (merkez 60,60; yarıçap 56) */
function arc(start: number, end: number): string {
  const r = 56;
  const c = 60;
  const x1 = c + r * Math.cos(start);
  const y1 = c + r * Math.sin(start);
  const x2 = c + r * Math.cos(end);
  const y2 = c + r * Math.sin(end);
  const large = end - start > Math.PI ? 1 : 0;
  return `M${c},${c} L${x1.toFixed(2)},${y1.toFixed(2)} A${r},${r} 0 ${large} 1 ${x2.toFixed(2)},${y2.toFixed(2)} Z`;
}

/** En çok alacağı olan müşteriler: ilk beş ve kalanı "Diğer" olarak pasta dilimi */
export default function ReceivablePie({
  parties,
  transactions,
}: {
  parties: Customer[];
  transactions: Transaction[];
}) {
  const owed = parties
    .filter((p) => p.kind === "customer")
    .map((p) => ({ name: p.name, amount: balanceOf(transactions, p.id) }))
    .filter((x) => x.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  const top = owed.slice(0, TOP);
  const restTotal = owed.slice(TOP).reduce((s, x) => s + x.amount, 0);
  const rows = [
    ...top.map((x, i) => ({ ...x, color: SLICES[i] })),
    ...(restTotal > 0 ? [{ name: t("Diğer"), amount: restTotal, color: OTHER }] : []),
  ];
  const total = rows.reduce((s, x) => s + x.amount, 0);

  let angle = -Math.PI / 2;
  const paths = rows.map((row) => {
    const span = total > 0 ? (row.amount / total) * Math.PI * 2 : 0;
    const d = span >= Math.PI * 2 - 1e-6 ? null : arc(angle, angle + span);
    angle += span;
    return { ...row, d };
  });

  return (
    <section className="card pie-card" aria-label={t("En çok alacağı olan müşteriler")}>
      <h2 className="card-title">{t("EN ÇOK ALACAĞI OLAN MÜŞTERİLER")}</h2>
      {rows.length === 0 ? (
        <p className="pie-empty">{t("Henüz alacak yok.")}</p>
      ) : (
        <div className="pie-body">
          <svg className="pie-svg" viewBox="0 0 120 120" role="img" aria-label={t("Alacak dağılımı")}>
            {paths.map((p) =>
              p.d ? (
                <path key={p.name} d={p.d} fill={p.color} stroke="rgba(22, 27, 34, 0.9)" strokeWidth="1.5" />
              ) : (
                <circle key={p.name} cx="60" cy="60" r="56" fill={p.color} />
              ),
            )}
          </svg>
          <ul className="pie-legend">
            {paths.map((p) => (
              <li key={p.name}>
                <i className="pie-dot" style={{ background: p.color }} />
                <span className="pie-name">{p.name}</span>
                <span className="pie-pct">{Math.round((p.amount / total) * 100)}%</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
