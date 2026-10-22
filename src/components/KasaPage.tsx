import { useState } from "react";
import {
  accountBalance,
  cashTotal,
  movementsOf,
  type Account,
  type AccountId,
  type Customer,
  type Transaction,
} from "../data/mock";
import { ACCENT } from "../lib/accents";
import { formatDateTime, money } from "../lib/format";
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
  const nameOf = (id: string) => parties.find((p) => p.id === id)?.name ?? "—";

  return (
    <div className="cust-page">
      <header className="cust-header">
        <button className="round-btn" aria-label="Geri" onClick={onBack}>
          <Svg d="M15 5l-7 7 7 7" />
        </button>
        <div className="cust-title">
          <span className="cust-avatar" aria-hidden="true">
            <Svg d="M3 7h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 7l2-3h12M16 14h.01" />
          </span>
          <div className="cust-name">
            <strong>Kasa</strong>
            <small>Toplam {money.format(cashTotal(transactions, accounts))}</small>
          </div>
        </div>
      </header>

      {/* Nakit ve banka seçenekleri */}
      <div className="party-bar">
        <div className="party-tabs" role="tablist" aria-label="Hesaplar">
          {accounts.map((a) => (
            <button
              key={a.id}
              role="tab"
              aria-selected={active === a.id}
              className={`party-tab ${active === a.id ? "is-active" : ""}`}
              onClick={() => setActive(a.id)}
            >
              <span className="party-tab-label">
                <span className="party-tab-name">{a.name}</span>
              </span>
              <span className="party-tab-meta">
                {money.format(accountBalance(transactions, accounts, a.id))}
              </span>
            </button>
          ))}
        </div>
      </div>

      <ul className="tx-list">
        <li className="tx">
          <div className="tx-hit">
            <div className="tx-info">
              <div className="tx-meta">
                <strong>AÇILIŞ BAKİYESİ</strong>
              </div>
              <p>{account.name}</p>
            </div>
            <span className="tx-amount">{money.format(account.opening)}</span>
          </div>
        </li>

        {movements.map((m) => {
          const out = m.type === "ÖDEME";
          return (
            <li key={m.id} className="tx">
              <div className="tx-hit">
                <div className="tx-info">
                  <div className="tx-meta">
                    <strong style={{ color: ACCENT[m.type].color }}>{m.type}</strong>
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
        <p className="tx-empty">Bu hesapta henüz tahsilat veya ödeme yok.</p>
      )}

      <div className="tx-total">
        <span>{account.name.toLocaleUpperCase("tr-TR")} BAKİYESİ</span>
        <strong>{money.format(accountBalance(transactions, accounts, active))}</strong>
      </div>
    </div>
  );
}
