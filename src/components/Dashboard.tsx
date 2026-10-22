import { useState } from "react";
import { customers, summaryByPeriod, type Period } from "../data/mock";

const PERIODS: { value: Period; label: string }[] = [
  { value: "monthly", label: "Aylık" },
  { value: "weekly", label: "Haftalık" },
  { value: "yearly", label: "Yıllık" },
];

const currency = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
  maximumFractionDigits: 0,
});

export default function Dashboard() {
  const [period, setPeriod] = useState<Period>("monthly");
  const summary = summaryByPeriod[period];

  return (
    <div className="dashboard">
      {/* Üst bölüm: istatistikler */}
      <section className="stats">
        <header className="stats-header">
          <h1 className="app-name">Hesabım</h1>
          <div className="segmented" role="tablist" aria-label="Dönem">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                role="tab"
                aria-selected={period === p.value}
                className={period === p.value ? "is-active" : ""}
                onClick={() => setPeriod(p.value)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </header>

        <div className="stat-cards">
          <div className="stat-card is-income">
            <span>Gelir</span>
            <strong>{currency.format(summary.income)}</strong>
          </div>
          <div className="stat-card is-expense">
            <span>Gider</span>
            <strong>{currency.format(summary.expense)}</strong>
          </div>
          <div className="stat-card">
            <span>Net</span>
            <strong>{currency.format(summary.income - summary.expense)}</strong>
          </div>
        </div>

        {/* Gelir/gider grafiği bir sonraki adımda eklenecek */}
        <div className="chart-placeholder">Gelir / Gider grafiği</div>
      </section>

      {/* Alt bölüm: müşteriler ve cariler */}
      <section className="customers">
        <h2>Müşteriler</h2>
        <ul className="customer-list">
          {customers.map((c) => (
            <li key={c.id}>
              <button className="customer-row">
                <span className="customer-name">{c.name}</span>
                <span
                  className={`customer-balance ${c.balance < 0 ? "is-debt" : "is-credit"}`}
                >
                  {currency.format(c.balance)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
