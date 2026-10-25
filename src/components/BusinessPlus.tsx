import { useRef, useState } from "react";
import { t } from "../lib/i18n";
import { haptic } from "../lib/haptics";
import type { Workspace } from "../lib/storage";
import { MAIN_WORKSPACE } from "../lib/storage";
import { Svg } from "./Icon";

/** Mağaza simgesi (firma kutusunda ve listede aynı) */
export const STORE_ICON = "M5 21V6l7-3 7 3v15M9 21v-5h6v5M9 9h1.5M13.5 9H15M9 13h1.5M13.5 13H15";

/** Listedeki tek bir işletme: dokununca geçilir, basılı tutunca Sil seçeneği çıkar */
function BizItem({
  b,
  active,
  onSwitch,
  onHold,
}: {
  b: Workspace & { color: string };
  active: boolean;
  onSwitch: () => void;
  onHold: () => void;
}) {
  // Satır bir düğme olduğu için basılı tutma kendi zamanlayıcısıyla algılanır
  const timer = useRef<number | null>(null);
  const fired = useRef(false);
  const clear = () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
  };
  return (
    <button
      type="button"
      className={`biz-item ${active ? "is-active" : ""}`}
      onPointerDown={() => {
        fired.current = false;
        clear();
        timer.current = window.setTimeout(() => {
          fired.current = true;
          haptic("medium");
          onHold();
        }, 500);
      }}
      onPointerUp={clear}
      onPointerLeave={clear}
      onPointerCancel={clear}
      onContextMenu={(e) => e.preventDefault()}
      onClick={() => {
        if (fired.current) {
          fired.current = false;
          return;
        }
        haptic("light");
        onSwitch();
      }}
    >
      <span className="biz-item-mark" style={{ color: b.color }} aria-hidden="true">
        <Svg d={STORE_ICON} />
      </span>
      <span className="biz-item-name">{b.name}</span>
      {active && <small aria-hidden="true">✓</small>}
    </button>
  );
}

/**
 * Firma kutusuna dokununca açılır: işletmeler listelenir, en altta + İşletme ekle.
 * Bir işletmeye basılı tutunca altında Sil ve Vazgeç çıkar (ana işletme silinemez).
 */
export default function BusinessPlus({
  top,
  left,
  businesses,
  activeId,
  onSwitch,
  onAdd,
  onDelete,
  onClose,
}: {
  /** Firma kutusunun alt kenarı ve sol kenarı (piksel) */
  top: number;
  left: number;
  businesses: (Workspace & { color: string })[];
  activeId: string;
  onSwitch: (id: string) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const [armed, setArmed] = useState<string | null>(null);

  return (
    <div className="biz-layer" onClick={onClose}>
      <div className="biz-col" style={{ top: top + 10, left }} onClick={(e) => e.stopPropagation()}>
        {businesses.map((b) => (
          <div key={b.id} className="biz-group">
            <BizItem
              b={b}
              active={b.id === activeId}
              onSwitch={() => onSwitch(b.id)}
              onHold={() => {
                if (b.id !== MAIN_WORKSPACE) setArmed(b.id);
              }}
            />
            {armed === b.id && (
              <div className="biz-delete">
                <button type="button" className="biz-delete-btn" onClick={() => onDelete(b.id)}>
                  {t("Sil")}
                </button>
                <button type="button" className="biz-cancel-btn" onClick={() => setArmed(null)}>
                  {t("Vazgeç")}
                </button>
              </div>
            )}
          </div>
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
