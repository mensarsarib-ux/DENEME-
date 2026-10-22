import { useEffect, useRef } from "react";
import {
  balanceOf,
  type Customer,
  type Group,
  type Transaction,
} from "../data/mock";
import { money } from "../lib/format";
import { Svg } from "./Icon";
import PartyTabs, { type TabInfo } from "./PartyTabs";

/** Tedarikçiler ve kullanıcının açtığı sekmelerin sayfası */
export default function GroupPage({
  group,
  members,
  tabs,
  transactions,
  highlightId,
  onSelect,
  onNew,
  onSelectTab,
  onCreateTab,
  onRenameTab,
  onDeleteTab,
  onBack,
}: {
  group: Group;
  members: Customer[];
  tabs: TabInfo[];
  transactions: Transaction[];
  /** Az önce eklenen kayıt: listede kaydırılıp vurgulanır */
  highlightId?: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onSelectTab: (id: string) => void;
  onCreateTab: (name: string) => void;
  onRenameTab: (id: string, name: string) => void;
  onDeleteTab: (id: string) => void;
  onBack: () => void;
}) {
  const highlightRef = useRef<HTMLButtonElement>(null);
  const isSupplier = group.id === "supplier";

  useEffect(() => {
    highlightRef.current?.scrollIntoView({ block: "center" });
  }, []);

  const rows = members
    .map((m) => ({ ...m, balance: balanceOf(transactions, m.id) }))
    .sort((a, b) => a.name.localeCompare(b.name, "tr"));
  const total = rows.reduce((sum, r) => sum + r.balance, 0);

  const addLabel = isSupplier ? "Yeni tedarikçi ekle" : "Yeni kayıt ekle";

  return (
    <div className="cust-page">
      <header className="cust-header">
        <button className="round-btn" aria-label="Ana ekrana dön" onClick={onBack}>
          <Svg d="M15 5l-7 7 7 7" />
        </button>
        <div className="cust-title">
          <span className="cust-avatar" aria-hidden="true">
            <Svg d="M3 8l9-5 9 5v1H3zM5 10v8M9 10v8M15 10v8M19 10v8M3 20h18" />
          </span>
          <div className="cust-name">
            <strong>{group.name}</strong>
            <small>
              {isSupplier ? "Borçlarınız ve ödemeleriniz" : "Özel sekme"}
            </small>
          </div>
        </div>
        <button className="round-btn" aria-label={addLabel} onClick={onNew}>
          <Svg d="M12 5v14M5 12h14" />
        </button>
      </header>

      <PartyTabs
        tabs={tabs}
        active={group.id}
        onSelect={onSelectTab}
        onCreate={onCreateTab}
        onRename={onRenameTab}
        onDelete={onDeleteTab}
      />

      <div className="group-head">
        <span>{group.name.toLocaleUpperCase("tr-TR")} (BORÇ / ALACAK)</span>
        <span className="group-total">{money.format(total)}</span>
      </div>

      {rows.length === 0 ? (
        <div className="search-empty">
          <p>
            {isSupplier
              ? "Henüz tedarikçi yok."
              : "Bu sekmede henüz kayıt yok."}
          </p>
          <button type="button" className="help-link" onClick={onNew}>
            {addLabel}
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
