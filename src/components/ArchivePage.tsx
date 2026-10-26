import { useEffect, useRef, useState } from "react";
import type { Customer, Group } from "../data/mock";
import PageHeader from "./PageHeader";
import { Svg } from "./Icon";
import { t } from "../lib/i18n";
import { haptic } from "../lib/haptics";

const ICON = "M3 5h18v4H3zM5 9v11h14V9M10 13h4";

/** Bir arşiv satırı: basılı tutunca "Arşivden çıkar" seçeneği görünür */
function ArchiveRow({
  party,
  armed,
  onHold,
  onRestore,
  onCancel,
}: {
  party: Customer;
  armed: boolean;
  onHold: () => void;
  onRestore: () => void;
  onCancel: () => void;
}) {
  const timer = useRef<number | null>(null);
  const clear = () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => clear, []);

  return (
    <li>
      <button
        type="button"
        className="row"
        onPointerDown={() => {
          clear();
          timer.current = window.setTimeout(() => {
            haptic("medium");
            onHold();
          }, 500);
        }}
        onPointerUp={clear}
        onPointerLeave={clear}
        onPointerCancel={clear}
        onContextMenu={(e) => e.preventDefault()}
      >
        <span className="row-name">{party.name}</span>
        <Svg d="M4 12h12M12 6l6 6-6 6" />
      </button>
      {armed && (
        <div className="archive-armed">
          <button type="button" className="archive-restore-btn" onClick={onRestore}>
            {t("Arşivden çıkar")}
          </button>
          <button type="button" className="archive-cancel-btn" onClick={onCancel}>
            {t("Vazgeç")}
          </button>
        </div>
      )}
    </li>
  );
}

/**
 * Arşiv: arşive alınan müşteri ve tedarikçiler, bulundukları sekmenin başlığı altında listelenir.
 * Kayıtlar silinmez; analizlerde ve raporlarda kullanılmaya devam eder.
 */
export default function ArchivePage({
  parties,
  groups,
  onRestore,
  onBack,
}: {
  parties: Customer[];
  groups: Group[];
  onRestore: (id: string) => void;
  onBack: () => void;
}) {
  const [armed, setArmed] = useState<string | null>(null);
  const archived = parties.filter((p) => p.archived);
  const sections = groups
    .map((g) => ({ group: g, items: archived.filter((p) => p.kind === g.id) }))
    .filter((s) => s.items.length > 0);

  return (
    <div className="cust-page">
      <PageHeader
        title={t("Arşiv")}
        subtitle={t("{n} kayıt", { n: archived.length })}
        icon={ICON}
        onBack={onBack}
      />
      {sections.length === 0 ? (
        <p className="search-empty">{t("Arşivde kayıt yok.")}</p>
      ) : (
        sections.map((s) => (
          <section className="card" key={s.group.id}>
            <h2 className="card-title">{t(s.group.name)}</h2>
            <ul className="list">
              {s.items.map((p) => (
                <ArchiveRow
                  key={p.id}
                  party={p}
                  armed={armed === p.id}
                  onHold={() => setArmed(p.id)}
                  onRestore={() => {
                    setArmed(null);
                    onRestore(p.id);
                  }}
                  onCancel={() => setArmed(null)}
                />
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
