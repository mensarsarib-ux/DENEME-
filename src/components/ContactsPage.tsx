import { useState } from "react";
import type { Customer, Group, PartyKind } from "../data/mock";
import { haptic } from "../lib/haptics";
import { t } from "../lib/i18n";
import { MENU_ITEMS } from "../lib/menu";
import { findMatch } from "../lib/search";
import ContactSheet, { type ContactPatch } from "./ContactSheet";
import Highlight from "./Highlight";
import PageHeader from "./PageHeader";

const ICON = MENU_ITEMS.find((m) => m.page === "contacts")!.icon;

/** Kişiler: tüm müşteri, tedarikçi ve özel sekme kayıtları; arama, arama/e-posta bağlantıları, iletişim düzenleme */
export default function ContactsPage({
  parties,
  groups,
  onUpdateParty,
  onOpenParty,
  onNewParty,
  onBack,
}: {
  parties: Customer[];
  groups: Group[];
  onUpdateParty: (id: string, patch: ContactPatch) => void;
  onOpenParty: (id: string) => void;
  /** Seçilen sekmeye yeni kişi eklemek için form sayfasını açar */
  onNewParty: (kind: PartyKind) => void;
  onBack: () => void;
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Customer | null>(null);
  const [choosing, setChoosing] = useState(false);

  const groupName = (kind: string) => t(groups.find((g) => g.id === kind)?.name ?? "");
  const rows = parties
    .map((p) => ({ p, range: findMatch(p.name, query) }))
    .filter((r) => !query.trim() || r.range)
    .sort((a, b) => a.p.name.localeCompare(b.p.name, "tr"));

  return (
    <div className="cust-page">
      <PageHeader
        title={t("Kişiler")}
        subtitle={t("{n} kişi", { n: parties.length })}
        icon={ICON}
        onBack={onBack}
        action={
          <button className="header-add" type="button" aria-label={t("Yeni kişi ekle")} onClick={() => setChoosing(true)}>
            {t("+ YENİ")}
          </button>
        }
      />
      <div className="search-bar">
        <input
          type="search"
          aria-label={t("Kişilerde ara")}
          placeholder={t("Kişilerde ara")}
          autoComplete="off"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {rows.length === 0 ? (
        <div className="search-empty">
          <p>{t("“{query}” ile eşleşen kişi yok.", { query: query.trim() })}</p>
        </div>
      ) : (
        <ul className="list">
          {rows.map(({ p, range }) => (
            <li key={p.id} className="contact-item">
              <button type="button" className="contact-row" onClick={() => setSelected(p)}>
                <span className="contact-main">
                  <span className="contact-name">
                    <Highlight text={p.name} range={range} />
                  </span>
                  <span className="contact-sub">
                    <span className="tx-account">{groupName(p.kind)}</span>
                    {p.phone && <span>{p.phone}</span>}
                    {!p.phone && p.email && <span>{p.email}</span>}
                    {!p.phone && !p.email && <span className="contact-empty">{t("İletişim bilgisi yok")}</span>}
                  </span>
                </span>
              </button>
              <span className="contact-actions">
                {p.phone && (
                  <a className="contact-link" href={`tel:${p.phone.replace(/\s+/g, "")}`} aria-label={t("{name} ara", { name: p.name })} onClick={() => haptic("light")}>
                    {t("Ara")}
                  </a>
                )}
                {p.email && (
                  <a className="contact-link" href={`mailto:${p.email}`} aria-label={t("{name} e-posta gönder", { name: p.name })} onClick={() => haptic("light")}>
                    {t("E-posta")}
                  </a>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}

      {selected && (
        <ContactSheet
          party={parties.find((p) => p.id === selected.id) ?? selected}
          groupName={groupName(selected.kind)}
          onSave={(patch) => onUpdateParty(selected.id, patch)}
          onOpenAccount={() => onOpenParty(selected.id)}
          onClose={() => setSelected(null)}
        />
      )}

      {choosing && (
        <div className="action-backdrop" onClick={() => setChoosing(false)}>
          <div className="action-sheet is-centered" role="dialog" aria-label={t("Sekme seç")} onClick={(e) => e.stopPropagation()}>
            <div className="action-handle" aria-hidden="true" />
            <h2 className="sheet-title">{t("Hangi sekmeye eklensin?")}</h2>
            <p className="sheet-note">{t("Kişi seçtiğiniz sekmenin listesine eklenir.")}</p>
            {groups.map((g) => (
              <button
                key={g.id}
                type="button"
                className="action-btn"
                onClick={() => {
                  setChoosing(false);
                  onNewParty(g.id);
                }}
              >
                {t(g.name)}
              </button>
            ))}
            <button className="action-btn is-cancel" type="button" onClick={() => setChoosing(false)}>{t("Vazgeç")}</button>
          </div>
        </div>
      )}
    </div>
  );
}
