import { useEffect } from "react";

/** Parmağın ekranın sol kenarından başlaması gereken en fazla uzaklık (px) */
const EDGE = 40;
/** Geri dönmek için gereken en az yatay kaydırma ve izin verilen en fazla dikey sapma (px) */
const DISTANCE = 70;
const DRIFT = 60;

/**
 * iOS'taki gibi: sol kenardan sağa kaydırınca sayfadaki "Geri" düğmesine basılır.
 * Açık bir pencere veya tuş takımı varken çalışmaz; Geri düğmesi olmayan ana ekranda bir şey yapmaz.
 */
export function useSwipeBack(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    let start: { x: number; y: number } | null = null;

    const onStart = (e: TouchEvent) => {
      const t = e.touches[0];
      start = e.touches.length === 1 && t.clientX <= EDGE ? { x: t.clientX, y: t.clientY } : null;
    };
    const onEnd = (e: TouchEvent) => {
      if (!start) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - start.x;
      const dy = Math.abs(t.clientY - start.y);
      start = null;
      if (dx < DISTANCE || dy > DRIFT || dy > dx) return;
      if (document.querySelector(".action-backdrop, .drawer-backdrop")) return;
      document.querySelector<HTMLButtonElement>('button[aria-label="Geri"]')?.click();
    };
    const onCancel = () => {
      start = null;
    };

    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchend", onEnd, { passive: true });
    document.addEventListener("touchcancel", onCancel, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchend", onEnd);
      document.removeEventListener("touchcancel", onCancel);
    };
  }, [enabled]);
}
