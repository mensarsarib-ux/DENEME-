import { useState } from "react";
import {
  accountBalance,
  monthRange,
  periodRange,
  cashTotal,
  movementsOf,
  type Account,
  type AccountId,
  type Customer,
  type Transaction,
} from "../data/mock";
import { ACCENT } from "../lib/accents";
import { formatDateTime, money } from "../lib/format";
import { locale, t } from "../lib/i18n";
import { Svg } from "./Icon";

/** Kasa: nakit ve banka seçenekleri; her birinin bakiyesi ve tahsilat/ödeme hareketleri */
export default function KasaPage({
  accounts,
  initialAccount = "cash",
  parties,
  transactions,
  onBack,
}: {
  accounts: Account[];
  /** Hesaplarım sayfasından gelirken açılacak hesap */
  initialAccount?: AccountId;
  parties: Customer[];
  transactions: Transaction[];
  onBack: () => void;
}) {
  const [active, setActive] = useState<AccountId>(initialAccount);
  const account = accounts.find((a) => a.id === active) ?? accounts[0];
  const movements = movementsOf(transactions, active);
  // Filtre ve sıralama: varsayılan en yeni işlem üstte
  const [kind, setKind] = useState<"all" | "TAHSİLAT" | "ÖDEME">("all");
  const [order, setOrder] = useState<"new" | "old">("new");
  const [sheetOpen, setSheetOpen] = useState(false);
  // Dönem: tümü, bu hafta, bu ay, geçen ay, bu yıl ya da kendi tarih aralığı
  type Span = "all" | "week" | "month" | "lastMonth" | "year" | "custom";
  const [span, setSpan] = useState<Span>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const inSpan = (iso: string): boolean => {
    const d = new Date(iso).getTime();
    if (span === "all") return true;
    if (span === "custom") {
      if (from && d < new Date(from + "T00:00").getTime()) return false;
      if (to && d >= new Date(to + "T00:00").getTime() + 86_400_000) return false;
      return true;
    }
    const [start, end] =
      span === "week" ? periodRange("weekly") : span === "month" ? monthRange(0) : span === "lastMonth" ? monthRange(-1) : periodRange("yearly");
    return d >= start.getTime() && d < end.getTime();
  };
  const visible = movements
    .filter((m) => kind === "all" || m.type === kind)
    .filter((m) => inSpan(m.date))
    .sort((a, b) => (order === "new" ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)));
  const nameOf = (id: string) => parties.find((p) => p.id === id)?.name ?? "—";

  return (
    <div className="cust-page">
      <header className="cust-header">
        <button className="round-btn" aria-label={t("Geri")} onClick={onBack}>
          <Svg d="M15 5l-7 7 7 7" />
        </button>
        <div className="cust-title">
          <span className="cust-avatar" aria-hidden="true">
            <Svg d="M3 7h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 7l2-3h12M16 14h.01" />
          </span>
          <div className="cust-name">
            <strong>{t("Kasa")}</strong>
            <small>{t("Toplam {amount}", { amount: money.format(cashTotal(transactions, accounts)) })}</small>
          </div>
        </div>
      </header>

      {/* Nakit ve banka seçenekleri */}
      <div className="party-bar">
        <div className="party-tabs" role="tablist" aria-label={t("Hesaplar")}>
          {accounts.map((a) => (
            <button
              key={a.id}
              role="tab"
              aria-selected={active === a.id}
              className={`party-tab ${active === a.id ? "is-active" : ""}`}
              onClick={() => setActive(a.id)}
            >
              <span className="party-tab-label">
                <span className="party-tab-name">{t(a.name)}</span>
              </span>
              <span className="party-tab-meta">
                {money.format(accountBalance(transactions, accounts, a.id))}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Tür filtresi (üç seçenek) ve tarih/sıralama simgesi */}
      <div className="kasa-filter-row" role="group" aria-label={t("Filtre")}>
        {(
          [
            ["all", t("Tümü")],
            ["TAHSİLAT", t("TAHSİLAT")],
            ["ÖDEME", t("ÖDEME")],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={`kasa-seg ${kind === value ? "is-active" : ""}`}
            aria-pressed={kind === value}
            onClick={() => setKind(value)}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          className={`kasa-cal ${span !== "all" || order !== "new" ? "is-on" : ""}`}
          aria-label={t("Tarih ve sıralama")}
          aria-haspopup="dialog"
          onClick={() => setSheetOpen(true)}
        >
          <Svg d="M4 5h16v15H4zM4 10h16M8 3v4M16 3v4" />
        </button>
      </div>

      {sheetOpen && (
        <div className="action-backdrop" onClick={() => setSheetOpen(false)}>
          <div className="action-sheet kasa-sheet" role="dialog" aria-label={t("Tarih ve sıralama")} onClick={(e) => e.stopPropagation()}>
            <div className="action-handle" aria-hidden="true" />
            <h2 className="sheet-title">{t("Dönem")}</h2>
            <div className="kasa-options">
              {(
                [
                  ["all", t("Tüm zamanlar")],
                  ["week", t("Bu hafta")],
                  ["month", t("Bu ay")],
                  ["lastMonth", t("Geçen ay")],
                  ["year", t("Bu yıl")],
                  ["custom", t("Tarih aralığı")],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={`action-btn ${span === value ? "is-active" : ""}`}
                  aria-pressed={span === value}
                  onClick={() => setSpan(value)}
                >
                  {label}
                </button>
              ))}
            </div>
            {span === "custom" && (
              <div className="kasa-range">
                <label>
                  {t("Başlangıç")}
                  <input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
                </label>
                <label>
                  {t("Bitiş")}
                  <input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
                </label>
              </div>
            )}
            <h2 className="sheet-title">{t("Sıralama")}</h2>
            <div className="kasa-options">
              {(
                [
                  ["new", t("En yeni")],
                  ["old", t("En eski")],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={`action-btn ${order === value ? "is-active" : ""}`}
                  aria-pressed={order === value}
                  onClick={() => setOrder(value)}
                >
                  {label}
                </button>
              ))}
            </div>
            <button className="primary-btn" type="button" onClick={() => setSheetOpen(false)}>
              {t("Tamam")}
            </button>
          </div>
        </div>
      )}

      <ul className="tx-list">
        {kind === "all" && (
          <li className="tx">
            <div className="tx-hit">
              <div className="tx-info">
                <div className="tx-meta">
                  <strong>{t("AÇILIŞ BAKİYESİ")}</strong>
                </div>
                <p>{t(account.name)}</p>
              </div>
              <span className="tx-amount">{money.format(account.opening)}</span>
            </div>
          </li>
        )}

        {visible.map((m) => {
          const out = m.type === "ÖDEME";
          return (
            <li key={m.id} className="tx">
              <div className="tx-hit">
                <div className="tx-info">
                  <div className="tx-meta">
                    <strong style={{ color: ACCENT[m.type].color }}>{t(m.type)}</strong>
                    <span>{formatDateTime(m.date)}</span>
                  </div>
                  <p>{nameOf(m.customerId)}</p>
                  {m.description && <p className="tx-sub">{m.description}</p>}
                </div>
                <span className={`tx-amount ${out ? "is-debt" : ""}`}>
                  {out ? "-" : ""}
                  {money.format(m.amount)}
                </span>
              </div>
            </li>
          );
        })}
      </ul>

      {movements.length === 0 && (
        <p className="tx-empty">{t("Bu hesapta henüz tahsilat veya ödeme yok.")}</p>
      )}
      {movements.length > 0 && visible.length === 0 && (
        <p className="tx-empty">{t("Bu filtrede hareket yok.")}</p>
      )}

      <div className="tx-total">
        <span>{t("{name} BAKİYESİ", { name: t(account.name).toLocaleUpperCase(locale()) })}</span>
        <strong>{money.format(accountBalance(transactions, accounts, active))}</strong>
      </div>
    </div>
  );
}
