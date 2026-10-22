import { money } from "../lib/format";
import type { PartyKind } from "../data/mock";

export interface PartySummary {
  count: number;
  total: number;
}

/** Müşteriler ve Tedarikçiler seçenekleri; ikisi de tıklanabilir */
export default function PartyTabs({
  active,
  customers,
  suppliers,
  onSelect,
}: {
  active: PartyKind;
  customers: PartySummary;
  suppliers: PartySummary;
  onSelect: (kind: PartyKind) => void;
}) {
  const tabs: { kind: PartyKind; label: string; summary: PartySummary }[] = [
    { kind: "customer", label: "Müşteriler", summary: customers },
    { kind: "supplier", label: "Tedarikçiler", summary: suppliers },
  ];

  return (
    <div className="party-tabs" role="tablist" aria-label="Cari hesaplar">
      {tabs.map((tab) => (
        <button
          key={tab.kind}
          role="tab"
          aria-selected={active === tab.kind}
          className={`party-tab ${active === tab.kind ? "is-active" : ""}`}
          onClick={() => onSelect(tab.kind)}
        >
          <span className="party-tab-label">
            {tab.label}
            {active !== tab.kind && (
              <span className="party-chevron" aria-hidden="true">
                ›
              </span>
            )}
          </span>
          <span className="party-tab-meta">
            {tab.summary.count} kayıt · {money.format(tab.summary.total)}
          </span>
        </button>
      ))}
    </div>
  );
}
