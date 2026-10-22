import { useState } from "react";
import {
  accounts,
  customers,
  summaryByPeriod,
  type Period,
} from "../data/mock";

const PERIODS: { value: Period; label: string }[] = [
  { value: "monthly", label: "Aylık" },
  { value: "weekly", label: "Haftalık" },
  { value: "yearly", label: "Yıllık" },
];

const money = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
  minimumFractionDigits: 2,
});

const now = new Date();

function periodTitle(period: Period): string {
  if (period === "monthly") {
    return now
      .toLocaleDateString("tr-TR", { month: "long" })
      .toLocaleUpperCase("tr-TR");
  }
  if (period === "weekly") return "BU HAFTA";
  return String(now.getFullYear());
}

/** Sol kenar çubuğu. Şimdilik yalnızca görsel; işlevleri sonraki adımlarda eklenecek. */
const NAV_ICONS = [
  {
    label: "Takvim",
    path: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4",
  },
  {
    label: "Defter",
    path: "M6 3h12v18H6zM9 8h6M9 12h6M9 16h4",
  },
  {
    label: "Grafik",
    path: "M5 20V12M12 20V5M19 20v-9",
  },
  {
    label: "Pasta",
    path: "M12 3v9h9a9 9 0 1 1-9-9z",
  },
];

export default function Dashboard() {
  const [period, setPeriod] = useState<Period>("monthly");
  const summary = summaryByPeriod[period];
  const net = summary.income - summary.expense;
  const maxFlow = Math.max(summary.income, summary.expense, 1);
  const customersTotal = customers.reduce((sum, c) => sum + c.balance, 0);

  return (
    <div className="app">
      {/* Üst çubuk */}
      <header className="topbar">
        <button className="topbar-menu" aria-label="Menü">
          Menü
        </button>
        <div className="company-pill">
          <span className="company-logo" aria-hidden="true">
            <img src="/logo.svg" alt="" />
          </span>
          <span className="company-text">
            <strong>Hesabım</strong>
            <small>Şirket adınız</small>
          </span>
        </div>
        <div className="topbar-actions">
          <button className="icon-btn" aria-label="Ara">
            <Svg d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4.3-4.3" />
          </button>
          <button className="icon-btn" aria-label="Yeni ekle">
            <Svg d="M12 5v14M5 12h14" />
          </button>
        </div>
      </header>

      <div className="notice-row">
        <button className="bell" aria-label="Bildirimler">
          <Svg d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 21h4" />
          <span className="badge">1</span>
        </button>
      </div>

      {/* Özet bölümü: dönem seçici + ay kartı */}
      <section className="summary">
        <nav className="side-nav" aria-label="Bölümler">
          {NAV_ICONS.map((item) => (
            <button key={item.label} className="side-btn" aria-label={item.label}>
              <Svg d={item.path} />
            </button>
          ))}
        </nav>

        <div className="summary-main">
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

          <div className="summary-card">
            <div className="summary-head">
              <span className="summary-title">{periodTitle(period)}</span>
              <span className="summary-net">{money.format(net)}</span>
            </div>

            <div className="summary-body">
              <div className="flow flow-in">
                <span>ALINAN</span>
                <strong>{money.format(summary.income)}</strong>
              </div>

              <div className="bars" aria-hidden="true">
                <div
                  className="bar bar-in"
                  style={{ height: `${(summary.income / maxFlow) * 100}%` }}
                />
                <div
                  className="bar bar-out"
                  style={{ height: `${(summary.expense / maxFlow) * 100}%` }}
                />
              </div>

              <div className="flow flow-out">
                <span>ÖDENEN</span>
                <strong>{money.format(summary.expense)}</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Alt sayfa: hesaplar ve cariler */}
      <section className="sheet">
        <div className="sheet-handle" aria-hidden="true" />

        <div className="group-head">
          <span>HESAPLAR</span>
        </div>
        <ul className="list">
          {accounts.map((a) => (
            <li key={a.id}>
              <button className="row row-big">
                <span className="row-name">{a.name}</span>
                <span className="row-amount">{money.format(a.balance)}</span>
              </button>
            </li>
          ))}
        </ul>

        <div className="group-head">
          <span>CARİ (BORÇ / ALACAK)</span>
          <span className="group-total">{money.format(customersTotal)}</span>
        </div>
        <ul className="list">
          {customers.map((c) => (
            <li key={c.id}>
              <button className="row">
                <span className="row-name">{c.name}</span>
                <span
                  className={`row-amount ${c.balance < 0 ? "is-debt" : ""}`}
                >
                  {money.format(c.balance)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Svg({ d }: { d: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}
