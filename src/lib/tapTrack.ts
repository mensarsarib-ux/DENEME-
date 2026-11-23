import { Capacitor } from "@capacitor/core";
import { appVersion } from "./version";

/**
 * Anonim dokunma kaydı (ısı haritası). Yalnızca ekran adı, düğme adı, ekrandaki yüzde konumu ve rastgele
 * bir oturum kimliği gönderilir. Metin, müşteri adı, tutar ya da kişisel veri gönderilmez.
 * Tablo: supabase/tap-events.sql. Hata olursa sessizce atlanır; uygulama etkilenmez.
 */

const URL_BASE = ((import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? "").replace(/\/+$/, "");
const ANON = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? "";

type Tap = {
  session_id: string;
  screen: string;
  element: string;
  x_pct: number;
  y_pct: number;
  viewport_w: number;
  app_version: string;
};

const queue: Tap[] = [];
let timer: number | null = null;

function sessionId(): string {
  try {
    const key = "hesabim:tap-sid";
    let id = sessionStorage.getItem(key);
    if (!id) {
      id = Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(36)).join("").slice(0, 16);
      sessionStorage.setItem(key, id);
    }
    return id;
  } catch {
    return "anon";
  }
}

/** Dokunulan ekranı, açık olan pencereye ve sayfa öğelerine bakarak bulur (metin okunmaz) */
function screenName(): string {
  const has = (sel: string) => !!document.querySelector(sel);
  if (has(".intro")) return "tanitim";
  if (has(".guest-welcome")) return "kapi";
  if (has(".guide")) return "rehber";
  if (has(".drawer")) return "menu";
  if (has(".action-backdrop")) return "pencere";
  if (has(".entry-dock")) return "musteri-sayfasi";
  if (has(".header-add") || has("#customer-name")) return "yeni-musteri";
  if (has(".ob-page")) return "giris";
  if (has(".topbar-menu")) return "ana-sayfa";
  return "diger";
}

/** Öğe adı: önce data-track, yoksa düğmenin ilk sınıfı. Öğenin yazısı okunmaz (müşteri adları burada yer alır) */
function elementName(target: Element | null): string {
  const el = target?.closest("[data-track], button, a, [role='button'], input, textarea, .row") ?? null;
  if (!el) return "bos-alan";
  const tracked = (el as HTMLElement).dataset?.track;
  if (tracked) return tracked.replace(/[^a-z0-9-_]/gi, "").slice(0, 60) || "izlenen";
  const cls = (el.getAttribute("class") ?? "").split(/\s+/).find((c) => /^[a-z][a-z0-9-_]*$/i.test(c));
  const tag = el.tagName.toLowerCase();
  return (cls ? `${tag}.${cls}` : tag).replace(/[^a-z0-9.\-_]/gi, "").slice(0, 60);
}

async function flush() {
  if (timer !== null) {
    window.clearTimeout(timer);
    timer = null;
  }
  if (!queue.length || !URL_BASE || !ANON) {
    queue.length = 0;
    return;
  }
  const batch = queue.splice(0, queue.length);
  try {
    await fetch(`${URL_BASE}/rest/v1/tap_events`, {
      method: "POST",
      keepalive: true,
      headers: {
        apikey: ANON,
        Authorization: `Bearer ${ANON}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(batch),
    });
  } catch {
    /* ağ yoksa kayıt atlanır */
  }
}

function schedule() {
  if (timer === null) timer = window.setTimeout(() => void flush(), 4000);
}

/**
 * Dokunma dışı bir olay kaydı (ör. SMS hatası): ekran adı ve kısa bir açıklama. Kişisel veri yazılmaz;
 * çağıran taraf telefon numarası gibi bilgileri ayıklayıp gönderir.
 */
export function trackEvent(screen: string, element: string) {
  if (!URL_BASE || !ANON) return;
  try {
    let version = "web";
    try {
      if (Capacitor.getPlatform() !== "web") version = appVersion();
    } catch {
      version = "web";
    }
    queue.push({
      session_id: sessionId(),
      screen: screen.slice(0, 40),
      element: element.slice(0, 60),
      x_pct: 0,
      y_pct: 0,
      viewport_w: Math.min(4000, Math.max(1, Math.round(window.innerWidth || 1))),
      app_version: version.slice(0, 20),
    });
    schedule();
  } catch {
    /* kayıt hatası uygulamayı etkilemesin */
  }
}

/** Uygulama açılışında bir kez çağrılır */
export function initTapTrack() {
  if (!URL_BASE || !ANON || typeof document === "undefined") return;
  // Tarayıcıdaki kayıtlar "web" olarak işaretlenir; uygulamada sürüm yazılır
  let version = "web";
  try {
    if (Capacitor.getPlatform() !== "web") version = appVersion();
  } catch {
    version = "web";
  }
  document.addEventListener(
    "click",
    (e) => {
      try {
        const x = e.clientX;
        const y = e.clientY;
        if (!Number.isFinite(x) || !Number.isFinite(y)) return;
        const w = window.innerWidth || 1;
        const h = window.innerHeight || 1;
        queue.push({
          session_id: sessionId(),
          screen: screenName(),
          element: elementName(e.target as Element | null),
          x_pct: Math.min(100, Math.max(0, (x / w) * 100)),
          y_pct: Math.min(100, Math.max(0, (y / h) * 100)),
          viewport_w: Math.min(4000, Math.max(1, Math.round(w))),
          app_version: version.slice(0, 20),
        });
        schedule();
      } catch {
        /* kayıt hatası uygulamayı etkilemesin */
      }
    },
    true,
  );
  window.addEventListener("pagehide", () => void flush());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") void flush();
  });
}
