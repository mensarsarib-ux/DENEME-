import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  accounts,
  balanceOf,
  totalsFor,
  type Customer,
  type Period,
  type Totals,
  type Transaction,
} from "../data/mock";
import { money, moneyRound } from "../lib/format";
import { findMatch, type MatchRange } from "../lib/search";
import Highlight from "./Highlight";
import PartyTabs, { type TabInfo } from "./PartyTabs";
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

interface Row {
  id: string;
  name: string;
  balance: number;
  /** Aramada eşleşen kısım; arama yoksa null */
  range: MatchRange | null;
}

export default function Dashboard({
  customers,
  tabs,
  transactions,
  highlightId,
  onSelectCustomer,
  onNewCustomer,
  onSelectTab,
  onCreateTab,
}: {
  customers: Customer[];
  /** Müşteriler, Tedarikçiler ve kullanıcının sekmeleri */
  tabs: TabInfo[];
  transactions: Transaction[];
  /** Az önce eklenen müşteri: listede kaydırılıp vurgulanır */
  highlightId?: string | null;
  onSelectCustomer: (id: string) => void;
  onNewCustomer: () => void;
  /** Müşteriler dışındaki bir sekmeye geçer */
  onSelectTab: (id: string) => void;
  onCreateTab: (name: string) => void;
}) {
  const [period, setPeriod] = useState<Period>("monthly");
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const highlightRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLElement>(null);

  useEffect(() => {
    highlightRef.current?.scrollIntoView({ block: "center" });
  }, []);

  const totals = totalsFor(transactions, period);
  const maxFlow = Math.max(totals.alis, totals.satis, totals.tahsilat, 1);
  // Ciro: dönemdeki satış toplamı. Kar: satıştan alışın çıkarılmasıyla bulunur.
  const ciro = totals.satis;
  const kar = totals.satis - totals.alis;

  const allRows: Row[] = customers
    .map((c) => ({
      id: c.id,
      name: c.name,
      balance: balanceOf(transactions, c.id),
      range: null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "tr"));

  const searching = searchOpen && query.trim() !== "";
  // Aramada isim başında eşleşenler öne gelir, sonra alfabetik sıra
  const rows: Row[] = searching
    ? allRows
        .map((r) => ({ ...r, range: findMatch(r.name, query) }))
        .filter((r) => r.range !== null)
        .sort(
          (a, b) =>
            a.range![0] - b.range![0] || a.name.localeCompare(b.name, "tr"),
        )
    : allRows;

  function closeSearch() {
    setSearchOpen(false);
    setQuery("");
  }

  return (
    <div className="app">
      {searchOpen ? (
        <header className="topbar topbar-search">
          <div className="search-field" role="search">
            <Svg d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4.3-4.3" />
            <input
              id="customer-search"
              type="search"
              autoFocus
              autoComplete="off"
              placeholder="Müşteri ara"
              aria-label="Müşteri ara"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") closeSearch();
                if (e.key === "Enter" && searching && rows[0]) {
                  onSelectCustomer(rows[0].id);
                }
              }}
            />
            {query && (
              <button
                className="search-clear"
                type="button"
                aria-label="Aramayı temizle"
                onClick={() => setQuery("")}
              >
                ×
              </button>
            )}
          </div>
          <button className="search-cancel" type="button" onClick={closeSearch}>
            Vazgeç
          </button>
        </header>
      ) : (
        <>
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
              <button
                className="icon-btn"
                aria-label="Ara"
                onClick={() => setSearchOpen(true)}
              >
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

              <div className="chart">
                {COLUMNS.map((col) => (
                  <div key={col.key} className={`col col-${col.key}`}>
                    <span className="col-value">
                      {moneyRound.format(totals[col.key])}
                    </span>
                    <div className="col-track">
                      <div
                        className="col-bar"
                        style={
                          {
                            "--h": `${Math.max((totals[col.key] / maxFlow) * 100, 3)}%`,
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
                  <span className="result-value">{money.format(ciro)}</span>
                  <span className="equation">Satış toplamı</span>
                </div>
                <div className="result-block">
                  <span className="result-label">KAR</span>
                  <span
                    className={`result-value ${kar < 0 ? "is-loss" : ""}`}
                  >
                    {money.format(kar)}
                  </span>
                  <span className="equation">
                    Satış <b>−</b> Alış
                  </span>
                </div>
              </div>
            </div>
          </section>
        </>
      )}

      {/* Alt sayfa: kasa ve cariler (aramada yalnızca müşteri sonuçları) */}
      <section className="sheet" ref={sheetRef}>
        <div className="sheet-handle" aria-hidden="true" />

        {!searchOpen && (
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
        )}

        {searchOpen ? (
          <div className="group-head">
            <span>{searching ? "ARAMA SONUÇLARI" : "MÜŞTERİLER"}</span>
            <span className="group-total" aria-live="polite">
              {searching
                ? `${rows.length} sonuç`
                : `${rows.length} müşteri`}
            </span>
          </div>
        ) : (
          <PartyTabs
            tabs={tabs}
            active="customer"
            onCreate={onCreateTab}
            onSelect={(id) => {
              if (id !== "customer") onSelectTab(id);
              else
                sheetRef.current?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                });
            }}
          />
        )}

        {searching && rows.length === 0 ? (
          <div className="search-empty">
            <p>“{query.trim()}” ile eşleşen müşteri yok.</p>
            <button type="button" className="help-link" onClick={onNewCustomer}>
              Yeni müşteri ekle
            </button>
          </div>
        ) : (
          <ul className="list">
            {rows.map((r, i) => (
              <li key={r.id}>
                <button
                  ref={r.id === highlightId ? highlightRef : undefined}
                  className={`row ${searching ? "is-match" : ""} ${searching && i === 0 ? "is-top" : ""} ${r.id === highlightId ? "is-new" : ""}`}
                  onClick={() => onSelectCustomer(r.id)}
                >
                  <span className="row-name">
                    <Highlight text={r.name} range={r.range} />
                  </span>
                  <span
                    className={`row-amount ${r.balance < 0 ? "is-debt" : ""}`}
                  >
                    {money.format(r.balance)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
