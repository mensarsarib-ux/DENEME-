import { useEffect, useRef } from "react";
import { balanceOf, type Customer, type Transaction } from "../data/mock";
import { money } from "../lib/format";
import { Svg } from "./Icon";
import PartyTabs, { type PartySummary } from "./PartyTabs";

export default function SuppliersPage({
  suppliers,
  customersSummary,
  transactions,
  highlightId,
  onSelect,
  onNew,
  onShowCustomers,
}: {
  suppliers: Customer[];
  customersSummary: PartySummary;
  transactions: Transaction[];
  /** Az önce eklenen tedarikçi: listede kaydırılıp vurgulanır */
  highlightId?: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  /** Müşteriler seçeneği: ana ekrana döner */
  onShowCustomers: () => void;
}) {
  const highlightRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    highlightRef.current?.scrollIntoView({ block: "center" });
  }, []);

  const rows = suppliers
    .map((s) => ({ ...s, balance: balanceOf(transactions, s.id) }))
    .sort((a, b) => a.name.localeCompare(b.name, "tr"));
  const total = rows.reduce((sum, r) => sum + r.balance, 0);

  return (
    <div className="cust-page">
      <header className="cust-header">
        <button
          className="round-btn"
          aria-label="Ana ekrana dön"
          onClick={onShowCustomers}
        >
          <Svg d="M15 5l-7 7 7 7" />
        </button>
        <div className="cust-title">
          <span className="cust-avatar" aria-hidden="true">
            <Svg d="M3 8l9-5 9 5v1H3zM5 10v8M9 10v8M15 10v8M19 10v8M3 20h18" />
          </span>
          <div className="cust-name">
            <strong>Tedarikçiler</strong>
            <small>Borçlarınız ve ödemeleriniz</small>
          </div>
        </div>
        <button
          className="round-btn"
          aria-label="Yeni tedarikçi ekle"
          onClick={onNew}
        >
          <Svg d="M12 5v14M5 12h14" />
        </button>
      </header>

      <PartyTabs
        active="supplier"
        customers={customersSummary}
        suppliers={{ count: rows.length, total }}
        onSelect={(kind) => kind === "customer" && onShowCustomers()}
      />

      <div className="group-head">
        <span>TEDARİKÇİLER (BORÇ / ALACAK)</span>
        <span className="group-total">{money.format(total)}</span>
      </div>

      {rows.length === 0 ? (
        <div className="search-empty">
          <p>Henüz tedarikçi yok.</p>
          <button type="button" className="help-link" onClick={onNew}>
            Yeni tedarikçi ekle
          </button>
        </div>
      ) : (
        <ul className="list supplier-list">
          {rows.map((r) => (
            <li key={r.id}>
              <button
                ref={r.id === highlightId ? highlightRef : undefined}
                className={`row ${r.id === highlightId ? "is-new" : ""}`}
                onClick={() => onSelect(r.id)}
              >
                <span className="row-name">{r.name}</span>
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
  );
}
