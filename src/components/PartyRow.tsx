import type { MouseEvent, ReactNode, Ref } from "react";
import { useEffect, useRef } from "react";
import { t } from "../lib/i18n";
import { haptic } from "../lib/haptics";

/** Basılı tutma süresi (ms) */
const HOLD_MS = 500;

/**
 * Müşteri/tedarikçi satırı: dokununca kayıt açılır, basılı tutunca arşivle ve sil seçenekleri çıkar.
 */
export function PartyRow({
  buttonRef,
  className,
  onOpen,
  onHold,
  children,
}: {
  buttonRef?: Ref<HTMLButtonElement>;
  className: string;
  onOpen: () => void;
  onHold: () => void;
  children: ReactNode;
}) {
  const timer = useRef<number | null>(null);
  const held = useRef(false);
  const clear = () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => clear, []);

  return (
    <button
      ref={buttonRef}
      type="button"
      className={className}
      onPointerDown={() => {
        held.current = false;
        clear();
        timer.current = window.setTimeout(() => {
          held.current = true;
          haptic("medium");
          onHold();
        }, HOLD_MS);
      }}
      onPointerUp={clear}
      onPointerLeave={clear}
      onPointerCancel={clear}
      onContextMenu={(e: MouseEvent) => e.preventDefault()}
      onClick={() => {
        // Basılı tutma seçenekleri açtıysa satır açılmaz
        if (held.current) {
          held.current = false;
          return;
        }
        onOpen();
      }}
    >
      {children}
    </button>
  );
}

/** Basılı tutulan kaydın altında açılan kart: Arşivle, Sil veya Vazgeç */
export function PartyActionSheet({
  name,
  onArchive,
  onDelete,
  onClose,
}: {
  name: string;
  onArchive: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  return (
    <div className="party-sheet-layer" onClick={onClose}>
      <div className="party-sheet" role="dialog" aria-label={name} onClick={(e) => e.stopPropagation()}>
        <p className="party-sheet-title">{name}</p>
        <p className="party-sheet-sub">{t("Ne yapmak istersiniz?")}</p>
        <button type="button" className="party-sheet-btn" onClick={onArchive}>
          {t("Arşivle")}
        </button>
        <button type="button" className="party-sheet-btn is-danger" onClick={onDelete}>
          {t("Sil")}
        </button>
        <button type="button" className="party-sheet-btn is-cancel" onClick={onClose}>
          {t("Vazgeç")}
        </button>
      </div>
    </div>
  );
}
