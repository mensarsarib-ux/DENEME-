import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
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

/** Etkin sekmeye göre değişen metinler */
function labelsFor(kind: string) {
  if (kind === "customer") {
    return {
      singular: "müşteri",
      add: "Yeni müşteri ekle",
      empty: "Henüz müşteri yok.",
      search: "Müşteri ara",
    };
  }
  if (kind === "supplier") {
    return {
      singular: "tedarikçi",
      add: "Yeni tedarikçi ekle",
      empty: "Henüz tedarikçi yok.",
      search: "Tedarikçi ara",
    };
  }
  return {
    singular: "kayıt",
    add: "Yeni kayıt ekle",
    empty: "Bu sekmede henüz kayıt yok.",
    search: "Kayıt ara",
  };
}

interface Row {
  id: string;
  name: string;
  balance: number;
  /** Aramada eşleşen kısım; arama yoksa null */
  range: MatchRange | null;
}

export default function Dashboard({
  members,
  activeTab,
  tabs,
  transactions,
  highlightId,
  onSelectParty,
  onNewParty,
  onSelectTab,
  onCreateTab,
  onRenameTab,
  onDeleteTab,
}: {
  /** Etkin sekmedeki kayıtlar (müşteriler, tedarikçiler veya özel sekme) */
  members: Customer[];
  activeTab: string;
  /** Müşteriler, Tedarikçiler ve kullanıcının sekmeleri */
  tabs: TabInfo[];
  transactions: Transaction[];
  /** Az önce eklenen kayıt: listede kaydırılıp vurgulanır */
  highlightId?: string | null;
  onSelectParty: (id: string) => void;
  /** Etkin sekmeye yeni kayıt ekler */
  onNewParty: () => void;
  /** Sekme değişince üstteki istatistikler yerinde kalır, yalnızca alttaki liste değişir */
  onSelectTab: (id: string) => void;
  onCreateTab: (name: string) => void;
  onRenameTab: (id: string, name: string) => void;
  onDeleteTab: (id: string) => void;
}) {
  const [period, setPeriod] = useState<Period>("monthly");
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const highlightRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  // Liste alanı gördüğü en büyük yüksekliğin altına inmez; böylece daha kısa bir sekmeye
  // geçince sayfa kısalıp yukarı kaymaz
  const [listMin, setListMin] = useState(0);

  useLayoutEffect(() => {
    if (searchOpen) return;
    const height = listRef.current?.getBoundingClientRect().height ?? 0;
    if (height > listMin) setListMin(Math.ceil(height));
  });

  useEffect(() => {
    highlightRef.current?.scrollIntoView({ block: "center" });
  }, []);

  const totals = totalsFor(transactions, period);
  const maxFlow = Math.max(totals.alis, totals.satis, totals.tahsilat, 1);

  const labels = labelsFor(activeTab);
  const activeName =
    tabs.find((t) => t.id === activeTab)?.name.toLocaleUpperCase("tr-TR") ?? "";

  const allRows: Row[] = members
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
              placeholder={labels.search}
              aria-label={labels.search}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") closeSearch();
                if (e.key === "Enter" && searching && rows[0]) {
                  onSelectParty(rows[0].id);
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
                aria-label={labels.add}
                onClick={onNewParty}
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
            </div>
          </section>
        </>
      )}

      {/* Alt sayfa: kasa ve etkin sekmenin kayıtları (aramada yalnızca etkin sekmede arama yapılır) */}
      <section className="sheet">
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
            <span>{searching ? "ARAMA SONUÇLARI" : activeName}</span>
            <span className="group-total" aria-live="polite">
              {searching
                ? `${rows.length} sonuç`
                : `${rows.length} ${labels.singular}`}
            </span>
          </div>
        ) : (
          <PartyTabs
            tabs={tabs}
            active={activeTab}
            onCreate={onCreateTab}
            onRename={onRenameTab}
            onDelete={onDeleteTab}
            onSelect={onSelectTab}
          />
        )}

        <div
          className="party-list"
          ref={listRef}
          style={{ minHeight: searchOpen ? undefined : listMin || undefined }}
        >
        {rows.length === 0 ? (
          <div className="search-empty">
            <p>
              {searching
                ? `“${query.trim()}” ile eşleşen ${labels.singular} yok.`
                : labels.empty}
            </p>
            <button type="button" className="help-link" onClick={onNewParty}>
              {labels.add}
            </button>
          </div>
        ) : (
          <ul className="list">
            {rows.map((r, i) => (
              <li key={r.id}>
                <button
                  ref={r.id === highlightId ? highlightRef : undefined}
                  className={`row ${searching ? "is-match" : ""} ${searching && i === 0 ? "is-top" : ""} ${r.id === highlightId ? "is-new" : ""}`}
                  onClick={() => onSelectParty(r.id)}
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
        </div>
      </section>
    </div>
  );
}
