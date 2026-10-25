import { t } from "../lib/i18n";
import { haptic } from "../lib/haptics";
import type { Workspace } from "../lib/storage";

/**
 * Firma kutusuna dokununca açılır: siyah katmanda mevcut işletmeler listelenir,
 * en altta kayarak gelen "+" ve "İşletme ekle" bulunur.
 */
export default function BusinessPlus({
  top,
  left,
  businesses,
  activeId,
  onSwitch,
  onAdd,
  onClose,
}: {
  /** Firma kutusunun alt kenarı ve sol kenarı (piksel) */
  top: number;
  left: number;
  businesses: Workspace[];
  activeId: string;
  onSwitch: (id: string) => void;
  onAdd: () => void;
  onClose: () => void;
}) {
  return (
    <div className="biz-layer" onClick={onClose}>
      <div className="biz-col" style={{ top: top + 10, left }} onClick={(e) => e.stopPropagation()}>
        {businesses.map((b) => (
          <button
            key={b.id}
            type="button"
            className={`biz-item ${b.id === activeId ? "is-active" : ""}`}
            onClick={() => {
              haptic("light");
              onSwitch(b.id);
            }}
          >
            <span>{b.name}</span>
            {b.id === activeId && <small aria-hidden="true">✓</small>}
          </button>
        ))}

        <div className="biz-row">
          <button
            type="button"
            className="biz-plus"
            aria-label={t("İşletme ekle")}
            onClick={() => {
              haptic("medium");
              onAdd();
            }}
          >
            +
          </button>
          <button type="button" className="biz-add" onClick={onAdd}>
            {t("İşletme ekle")}
          </button>
        </div>
      </div>
    </div>
  );
}
