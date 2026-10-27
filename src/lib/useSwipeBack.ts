import { useEffect } from "react";

/** Parmağın ekranın sol kenarından başlaması gereken en fazla uzaklık (px) */
const EDGE = 40;
/** Geri dönmek için gereken oran: ekran genişliğinin bu kadarından fazla kayınca sayfa kapanır */
const COMMIT_RATIO = 0.4;
/** iOS'taki yay benzeri hareket eğrisi ve süre */
const EASE = "transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)";
const SETTLE_MS = 360;

/**
 * iOS'taki gibi: sol kenardan sağa kaydırınca sayfa parmağı takip eder; yeterince kayınca
 * sayfa sağa doğru kayarak kapanır ve "Geri" düğmesine basılmış olur. Yetersizse yerine döner.
 * Açık bir pencere veya çekmece varken çalışmaz; Geri düğmesi olmayan ana ekranda bir şey yapmaz.
 */
export function useSwipeBack(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    let start: { x: number; y: number; axis: "x" | "y" | null } | null = null;
    let page: HTMLElement | null = null;

    const onStart = (e: TouchEvent) => {
      const t = e.touches[0];
      const ok =
        e.touches.length === 1 &&
        t.clientX <= EDGE &&
        !document.querySelector(".action-backdrop, .drawer-backdrop") &&
        document.querySelector('button[aria-label="Geri"]');
      start = ok ? { x: t.clientX, y: t.clientY, axis: null } : null;
      page = ok ? document.querySelector<HTMLElement>(".cust-page") : null;
    };

    const onMove = (e: TouchEvent) => {
      if (!start || !page) return;
      const t = e.touches[0];
      const dx = t.clientX - start.x;
      const dy = t.clientY - start.y;
      if (!start.axis) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        start.axis = dx > 0 && dx > Math.abs(dy) ? "x" : "y";
        if (start.axis === "x") {
          page.style.transition = "none";
          page.style.boxShadow = "-12px 0 28px rgba(0, 0, 0, 0.35)";
        } else {
          start = null;
          return;
        }
      }
      page.style.transform = `translateX(${Math.max(0, dx)}px)`;
    };

    const onEnd = (e: TouchEvent) => {
      if (!start || start.axis !== "x" || !page) {
        start = null;
        return;
      }
      const t = e.changedTouches[0];
      const dx = Math.max(0, t.clientX - start.x);
      const target = page;
      const back = document.querySelector<HTMLButtonElement>('button[aria-label="Geri"]');
      start = null;
      page = null;

      target.style.transition = EASE;
      const commit = dx > window.innerWidth * COMMIT_RATIO;
      target.style.transform = commit ? `translateX(${window.innerWidth}px)` : "translateX(0px)";
      window.setTimeout(() => {
        if (commit) back?.click();
        // Sayfa aynı kalıyorsa (ör. ayar grupları) konumu da sıfırlanmalı; bu yüzden her durumda temizlenir
        target.style.transition = "none";
        target.style.transform = "";
        target.style.boxShadow = "";
      }, SETTLE_MS);
    };

    const onCancel = () => {
      start = null;
      page = null;
    };

    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchmove", onMove, { passive: true });
    document.addEventListener("touchend", onEnd, { passive: true });
    document.addEventListener("touchcancel", onCancel, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onEnd);
      document.removeEventListener("touchcancel", onCancel);
    };
  }, [enabled]);
}
