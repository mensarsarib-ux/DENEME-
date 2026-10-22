import { useState, type CSSProperties } from "react";
import {
  accounts,
  balanceOf,
  totalsFor,
  type Customer,
  type Period,
  type Totals,
  type Transaction,
} from "../data/mock";
import { money } from "../lib/format";
import AnimatedMoney from "./AnimatedMoney";
import { Svg } from "./Icon";

const PERIODS: { value: Period; label: string }[] = [
  { value: "daily", label: "Günlük" },
  { value: "weekly", label: "Haftalık" },
  { value: "monthly", label: "Aylık" },
  { value: "yearly", label: "Yıllık" },
];

const COLUMNS: { key: keyof Totals; label: string }[] = [
  { key: "alis", label: "ALIŞ" },
  { key: "satis", label: "SATIŞ" },
  { key: "tahsilat", label: "TAHSİLAT" },
];

const now = new Date();

function periodTitle(period: Period): string {
  if (period === "daily") return "BUGÜN";
  if (period === "weekly") return "BU HAFTA";
  if (period === "monthly") {
    return now
      .toLocaleDateString("tr-TR", { month: "long" })
      .toLocaleUpperCase("tr-TR");
  }
  return String(now.getFullYear());
}

export default function Dashboard({
  customers,
  transactions,
  onSelectCustomer,
  onNewCustomer,
}: {
  customers: Customer[];
  transactions: Transaction[];
  onSelectCustomer: (id: string) => void;
  onNewCustomer: () => void;
}) {
  const [period, setPeriod] = useState<Period>("monthly");
  const totals = totalsFor(transactions, period);
  const maxFlow = Math.max(totals.alis, totals.satis, totals.tahsilat, 1);
  // Ciro: dönemdeki satış toplamı. Kar: satıştan alışın çıkarılmasıyla bulunur.
  const ciro = totals.satis;
  const kar = totals.satis - totals.alis;

  const customerRows = customers
    .map((c) => ({ ...c, balance: balanceOf(transactions, c.id) }))
    .sort((a, b) => a.name.localeCompare(b.name, "tr"));
  const customersTotal = customerRows.reduce((sum, c) => sum + c.balance, 0);

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
          <button
            className="icon-btn"
            aria-label="Yeni müşteri ekle"
            onClick={onNewCustomer}
          >
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

      {/* Özet bölümü: dönem seçici + grafik */}
      <section className="summary">
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

        <div className="chart-card">
          <div className="chart-title">{periodTitle(period)}</div>

          {/* key: dönem değişince sütun animasyonu yeniden başlar */}
          <div className="chart" key={period}>
            {COLUMNS.map((col, i) => (
              <div key={col.key} className={`col col-${col.key}`}>
                <AnimatedMoney className="col-value" value={totals[col.key]} />
                <div className="col-track">
                  <div
                    className="col-bar"
                    style={
                      {
                        "--h": `${Math.max((totals[col.key] / maxFlow) * 100, 3)}%`,
                        "--d": `${i * 130}ms`,
                      } as CSSProperties
                    }
                  />
                </div>
                <span className="col-label">{col.label}</span>
              </div>
            ))}
          </div>

          <div className="result">
            <div className="result-block">
              <span className="result-label">CİRO</span>
              <AnimatedMoney className="result-value" value={ciro} precise />
              <span className="equation">Satış toplamı</span>
            </div>
            <div className="result-block">
              <span className="result-label">KAR</span>
              <AnimatedMoney
                className={`result-value ${kar < 0 ? "is-loss" : ""}`}
                value={kar}
                precise
              />
              <span className="equation">
                Satış <b>−</b> Alış
              </span>
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
          {customerRows.map((c) => (
            <li key={c.id}>
              <button className="row" onClick={() => onSelectCustomer(c.id)}>
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
