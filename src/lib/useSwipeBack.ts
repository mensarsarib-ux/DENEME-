import { useEffect } from "react";
import { homeUnderlay } from "./homeSnapshot";

/** Parmağın ekranın sol kenarından başlaması gereken en fazla uzaklık (px) */
const EDGE = 40;
/** Geri dönmek için gereken oran: ekran genişliğinin bu kadarından fazla kayınca sayfa kapanır */
const COMMIT_RATIO = 0.4;
/** iOS'taki yay benzeri hareket eğrisi ve süre */
const EASE = "transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)";
const SETTLE_MS = 360;
/** Arkadaki ana ekranın başlangıçta sola kayma oranı (ekran genişliğinin yüzdesi, 0–1) */
const UNDERLAY_SHIFT = 0.3;

/** Sağdan sola dillerde (Arapça) hareketler aynalanır: 1 soldan sağa, -1 sağdan sola */
const sign = () => (document.documentElement.dir === "rtl" ? -1 : 1);

/** Geri dönülen ekran soldan kayarak yerine oturur (iOS'taki gibi) */
function enterFromLeft() {
  const dir = sign();
  window.requestAnimationFrame(() => {
    const next = document.querySelector<HTMLElement>(".cust-page, .app");
    next?.animate(
      [
        { transform: `translateX(${-28 * dir}%)`, opacity: 0.6 },
        { transform: "none", opacity: 1 },
      ],
      { duration: 350, easing: "cubic-bezier(0.32, 0.72, 0, 1)" },
    );
  });
}

/**
 * iOS'taki gibi (Arapçada aynalanmış): sol kenardan sağa kaydırınca sayfa parmağı takip eder; yeterince kayınca
 * sayfa sağa doğru kayarak kapanır ve "Geri" düğmesine basılmış olur. Yetersizse yerine döner.
 * Açık bir pencere veya çekmece varken çalışmaz; Geri düğmesi olmayan ana ekranda bir şey yapmaz.
 */
export function useSwipeBack(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    let start: { x: number; y: number; axis: "x" | "y" | null; inner: boolean } | null = null;
    let page: HTMLElement | null = null;
    let underlay: HTMLElement | null = null;
    let dir = 1;

    const onStart = (e: TouchEvent) => {
      const t = e.touches[0];
      dir = sign();
      const ok =
        e.touches.length === 1 &&
        (dir === 1 ? t.clientX <= EDGE : t.clientX >= window.innerWidth - EDGE) &&
        !document.querySelector(".action-backdrop, .drawer-backdrop") &&
        document.querySelector("button[data-back]");
      const inner = ok ? document.querySelector<HTMLElement>("button[data-back]")?.dataset.inner === "1" : false;
      start = ok ? { x: t.clientX, y: t.clientY, axis: null, inner } : null;
      page = ok ? document.querySelector<HTMLElement>(".cust-page") : null;
    };

    const onMove = (e: TouchEvent) => {
      if (!start || !page) return;
      const t = e.touches[0];
      const dx = (t.clientX - start.x) * dir;
      const dy = t.clientY - start.y;
      if (!start.axis) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        start.axis = dx > 0 && dx > Math.abs(dy) ? "x" : "y";
        if (start.axis === "x") {
          page.style.transition = "none";
          page.style.boxShadow = `${-12 * dir}px 0 28px rgba(0, 0, 0, 0.35)`;
          // Arkada ana ekranın kopyası: sayfa kaydıkça soldan yerine kayar (aynı sayfa içi geri dönüşte kopya gösterilmez)
          const copy = start.inner ? null : homeUnderlay();
          const parent = page.parentElement;
          if (copy && parent) {
            underlay = copy;
            underlay.style.position = "absolute";
            underlay.style.inset = "0";
            underlay.style.zIndex = "0";
            underlay.style.pointerEvents = "none";
            underlay.style.overflow = "hidden";
            underlay.style.transform = `translateX(${-UNDERLAY_SHIFT * 100 * dir}%)`;
            parent.insertBefore(underlay, page);
            page.style.position = "relative";
            page.style.zIndex = "1";
          }
        } else {
          start = null;
          return;
        }
      }
      const shift = Math.max(0, dx);
      page.style.transform = `translateX(${shift * dir}px)`;
      if (underlay) {
        const width = window.innerWidth;
        const progress = Math.min(1, shift / width);
        underlay.style.transform = `translateX(${-UNDERLAY_SHIFT * width * (1 - progress) * dir}px)`;
      }
    };

    const onEnd = (e: TouchEvent) => {
      if (!start || start.axis !== "x" || !page) {
        start = null;
        return;
      }
      const t = e.changedTouches[0];
      const dx = Math.max(0, (t.clientX - start.x) * dir);
      const target = page;
      const back = document.querySelector<HTMLButtonElement>("button[data-back]");
      start = null;
      page = null;

      target.style.transition = EASE;
      const commit = dx > window.innerWidth * COMMIT_RATIO;
      target.style.transform = commit ? `translateX(${window.innerWidth * dir}px)` : "translateX(0px)";
      const under = underlay;
      underlay = null;
      if (under) {
        under.style.transition = EASE;
        under.style.transform = commit ? "translateX(0px)" : `translateX(${-UNDERLAY_SHIFT * window.innerWidth * dir}px)`;
      }
      window.setTimeout(() => {
        if (commit) {
          back?.click();
          // Arkada kopya zaten yerinde; yeni ekranı ayrıca kaydırmak görüntüde ikinci bir hareket yapar.
          // Aynı sayfa içi geri dönüşte (kopya yok) içerik soldan kayarak gelir.
          if (!under) enterFromLeft();
        }
        // Sayfa aynı kalıyorsa (ör. ayar grupları) konumu da sıfırlanmalı; bu yüzden her durumda temizlenir
        target.style.transition = "none";
        target.style.transform = "";
        target.style.boxShadow = "";
        target.style.position = "";
        target.style.zIndex = "";
        under?.remove();
      }, SETTLE_MS);
    };

    const onCancel = () => {
      start = null;
      page = null;
      underlay?.remove();
      underlay = null;
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
