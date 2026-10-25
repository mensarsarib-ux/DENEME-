import { useEffect, useLayoutEffect, useRef, useState } from "react";
import BusinessPlus from "./BusinessPlus";
import { useLongPress } from "../lib/useLongPress";
import {
  balanceOf,
  cashTotal,
  type Account,
  type Customer,
  type Profile,
  type Transaction,
} from "../data/mock";
import { money } from "../lib/format";
import { findMatch, type MatchRange } from "../lib/search";
import { locale, t } from "../lib/i18n";
import StatsCarousel from "./StatsCarousel";
import Highlight from "./Highlight";
import PartyTabs, { type TabInfo } from "./PartyTabs";
import { Svg } from "./Icon";

/** Logo yoksa firma kutusunda görünen dükkân simgesi */
const SHOP_ICON = "M4 9l2-5h12l2 5M4 9h16v11H4zM9 20v-6h6v6M4 9c0 1.5 1.3 2.5 3 2.5S10 10.5 10 9c0 1.5 1.3 2.5 3 2.5S16 10.5 16 9c0 1.5 1.3 2.5 3 2.5S22 10.5 22 9";

/** Etkin sekmeye göre değişen metinler */
function labelsFor(kind: string) {
  if (kind === "customer") {
    return {
      count: (n: number) => t("{n} müşteri", { n }),
      noMatch: (q: string) => t("“{q}” ile eşleşen müşteri yok.", { q }),
      add: t("Yeni müşteri ekle"),
      empty: t("Henüz müşteri yok."),
      search: t("Müşteri ara"),
    };
  }
  if (kind === "supplier") {
    return {
      count: (n: number) => t("{n} tedarikçi", { n }),
      noMatch: (q: string) => t("“{q}” ile eşleşen tedarikçi yok.", { q }),
      add: t("Yeni tedarikçi ekle"),
      empty: t("Henüz tedarikçi yok."),
      search: t("Tedarikçi ara"),
    };
  }
  return {
    count: (n: number) => t("{n} kayıt", { n }),
    noMatch: (q: string) => t("“{q}” ile eşleşen kayıt yok.", { q }),
    add: t("Yeni kayıt ekle"),
    empty: t("Bu sekmede henüz kayıt yok."),
    search: t("Kayıt ara"),
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
  profile,
  accounts,
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
  onOpenMenu,
  onOpenKasa,
}: {
  /** İşletme profili: üst çubukta ad olarak görünür */
  profile: Profile;
  accounts: Account[];
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
  /** Kasa satırına dokununca nakit ve banka sayfası açılır */
  onOpenKasa: () => void;
  /** Sol üstteki Menü: yan menü penceresini açar */
  onOpenMenu: () => void;
}) {
  const [searchOpen, setSearchOpen] = useState(false);
  // Firma kutusuna basılı tutunca altında "+" çıkar; konumu bu kutudan alınır
  const pillRef = useRef<HTMLDivElement>(null);
  const markRef = useRef<HTMLSpanElement>(null);
  const [plusAt, setPlusAt] = useState<{ top: number; left: number; width: number } | null>(null);
  const { handlers: pillHandlers } = useLongPress(() => {
    // Konum logonun altından alınır: + ve paketler tam logonun altında açılır
    const m = markRef.current?.getBoundingClientRect();
    if (m) setPlusAt({ top: m.bottom, left: m.left, width: 220 });
  });
  const [query, setQuery] = useState("");
  const highlightRef = useRef<HTMLButtonElement>(null);
  /**
   * Kayan alan: üstteki grafik sabit durur, alt bölüm (kasa, sekmeler, liste) kayarak
   * grafiğin üzerini kapatır. Üst çubuk bu alanın dışındadır ve yerinde kalır.
   */
  const scrollRef = useRef<HTMLDivElement>(null);
  // Liste yukarı çıktıkça arkadaki özet (grafik) hafifçe bulanıklaşır ve kararır
  const summaryRef = useRef<HTMLElement>(null);
  const onScrollSummary = () => {
    const el = scrollRef.current;
    const summary = summaryRef.current;
    if (!el || !summary) return;
    const p = Math.min(1, Math.max(0, el.scrollTop / 180));
    summary.style.opacity = String(1 - p * 0.6);
    summary.style.filter = p > 0 ? `blur(${(p * 4).toFixed(2)}px)` : "";
  };
  // Alt bölüm en az kayan alanın yüksekliği kadar olur; böylece grafiği tamamen kapatacak kadar kayabilir
  const [sheetMin, setSheetMin] = useState(0);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () => setSheetMin(el.clientHeight + (summaryRef.current?.offsetHeight ?? 0));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Arama değişince sonuçlar en üstten başlar
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [query]);

  // Az önce eklenen kayıt listede görünür alana kaydırılır
  useEffect(() => {
    highlightRef.current?.scrollIntoView({ block: "center" });
  }, []);

  const labels = labelsFor(activeTab);
  const activeName =
    t(tabs.find((tab) => tab.id === activeTab)?.name ?? "").toLocaleUpperCase(locale());

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
                aria-label={t("Aramayı temizle")}
                onClick={() => setQuery("")}
              >
                ×
              </button>
            )}
          </div>
          <button className="search-cancel" type="button" onClick={closeSearch}>
            {t("Vazgeç")}
          </button>
        </header>
      ) : (
        <>
          {/* Üst çubuk */}
          <header className="topbar">
            <button
              className="topbar-menu"
              aria-label={t("Menüyü aç")}
              aria-haspopup="dialog"
              onClick={onOpenMenu}
            >
              {t("Menü")}
            </button>
            <div
              className="company-pill"
              ref={pillRef}
              {...pillHandlers}
              onContextMenu={(e) => e.preventDefault()}
            >
              <span className="company-mark" ref={markRef} aria-hidden="true">
                {profile.logo ? <img src={profile.logo} alt="" /> : <Svg d={SHOP_ICON} />}
              </span>
              <span className="company-text">
                <strong>{profile.name || t("Hesabım")}</strong>
                {profile.email && <small>{profile.email}</small>}
              </span>
            </div>
            {plusAt && <BusinessPlus {...plusAt} onClose={() => setPlusAt(null)} />}
            <div className="topbar-actions">
              <button
                className="icon-btn"
                aria-label={t("Ara")}
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

        </>
      )}

      <div className="scroll-wrap">
        <div className="scroll" ref={scrollRef} onScroll={onScrollSummary}>
          {/* Özet bölümü: gelir ve gider grafiği (basılı tutunca dönem seçilir). Yukarıda sabit
              durur, alt bölüm kayarak üzerini kapatır. */}
          {!searchOpen && (
            <section className="summary" ref={summaryRef}>
              <StatsCarousel transactions={transactions} />
            </section>
          )}

          {/* Alt bölüm: kasa ve etkin sekmenin kayıtları (aramada yalnızca etkin sekmede arama yapılır) */}
      <section className="sheet" style={{ minHeight: sheetMin || undefined }}>
        <div className="sheet-handle" aria-hidden="true" />

        {!searchOpen && (
          <ul className="list">
            <li>
              <button
                className="row row-big"
                aria-label={t("Kasa: nakit ve banka")}
                onClick={onOpenKasa}
              >
                <span className="row-name">{t("Kasa")}</span>
                <span className="row-amount">
                  {money.format(cashTotal(transactions, accounts))}
                  <span className="row-chevron" aria-hidden="true">
                    ›
                  </span>
                </span>
              </button>
            </li>
          </ul>
        )}


        {/* Sekmeler yukarı çıkınca üstte sabit kalır; altındaki liste kaymaya devam eder */}
        <div className="sheet-head">
        {searchOpen ? (
          <div className="group-head">
            <span>{searching ? t("ARAMA SONUÇLARI") : activeName}</span>
            <span className="group-total" aria-live="polite">
              {searching
                ? t("{n} sonuç", { n: rows.length })
                : labels.count(rows.length)}
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

        </div>

        <div className="party-list">
        {rows.length === 0 ? (
          <div className="search-empty">
            <p>
              {searching
                ? labels.noMatch(query.trim())
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
      </div>
    </div>
  );
}
