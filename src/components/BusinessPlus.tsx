import { t } from "../lib/i18n";
import { haptic } from "../lib/haptics";
import type { Workspace } from "../lib/storage";
import { Svg } from "./Icon";

/** Mağaza simgesi (firma kutusunda ve listede aynı) */
export const STORE_ICON = "M5 21V6l7-3 7 3v15M9 21v-5h6v5M9 9h1.5M13.5 9H15M9 13h1.5M13.5 13H15";

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
  businesses: (Workspace & { color: string })[];
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
            <span className="biz-item-mark" style={{ color: b.color }} aria-hidden="true">
              <Svg d={STORE_ICON} />
            </span>
            <span className="biz-item-name">{b.name}</span>
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
