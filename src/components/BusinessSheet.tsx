import { t } from "../lib/i18n";
import { haptic } from "../lib/haptics";

/** Ücretsiz planda bir işletme; ücretli paketlerde daha fazla işletme eklenebilir */
const PLANS: { count: number; price: string }[] = [
  { count: 2, price: "—" },
  { count: 5, price: "—" },
  { count: 10, price: "—" },
];

/** Basılı tutunca açılan işletme seçimi ve paket seçenekleri */
export default function BusinessSheet({
  businesses,
  currentName,
  onChoose,
  onClose,
}: {
  businesses: { id: string; name: string }[];
  currentName: string;
  onChoose: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="action-backdrop" onClick={onClose}>
      <div className="action-sheet business-sheet" role="dialog" aria-label={t("İşletmeler")} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" aria-hidden="true" />
        <h2 className="sheet-title">{t("İşletmeler")}</h2>

        <div className="action-list">
          {businesses.map((b) => (
            <button
              key={b.id}
              type="button"
              className={`action-btn ${b.name === currentName ? "is-active" : ""}`}
              onClick={() => {
                haptic("light");
                onChoose(b.id);
              }}
            >
              {b.name}
              {b.name === currentName && <span aria-hidden="true"> ✓</span>}
            </button>
          ))}
        </div>

        <p className="sheet-note">{t("Ücretsiz planda 1 işletme bulunur. Daha fazla işletme için paket seçin.")}</p>

        <div className="action-list">
          {PLANS.map((p) => (
            <button key={p.count} type="button" className="action-btn is-disabled" disabled>
              {t("{n} işletme", { n: p.count })}
              <span aria-hidden="true"> · {t("Yakında")}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
