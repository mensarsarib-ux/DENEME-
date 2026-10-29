import { useEffect, useRef, useState } from "react";
import { isLockEnabled, verifyOwner } from "../lib/appLock";
import { t } from "../lib/i18n";

/** Arka planda bu süreden uzun kalınırsa dönüşte kimlik doğrulaması istenir */
const GRACE_MS = 30_000;

/**
 * Uygulama kilidi katmanı: kilit açıksa açılışta ve uzun süre arka planda kalındıktan sonra
 * uygulamanın üstünü kapatır ve Face ID ister. Arka plana geçerken içerik hemen gizlenir
 * (uygulama değiştiricideki önizlemede kayıtlar görünmez).
 */
export default function AppLock() {
  const [locked, setLocked] = useState(isLockEnabled);
  const [covered, setCovered] = useState(false);
  const hiddenAt = useRef<number | null>(null);
  const asking = useRef(false);

  async function unlock() {
    if (asking.current) return;
    asking.current = true;
    const ok = await verifyOwner();
    asking.current = false;
    if (ok) setLocked(false);
  }

  // Açılışta kilitliyse hemen sorulur
  useEffect(() => {
    if (locked) void unlock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onVisibility = () => {
      if (!isLockEnabled()) return;
      if (document.visibilityState === "hidden") {
        // Face ID penceresi uygulamayı arka plana almaz; burası gerçekten uygulamadan çıkıldığında çalışır
        hiddenAt.current = Date.now();
        setCovered(true);
        return;
      }
      setCovered(false);
      const away = hiddenAt.current ? Date.now() - hiddenAt.current : 0;
      hiddenAt.current = null;
      if (away >= GRACE_MS) {
        setLocked(true);
        void unlock();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!locked && !covered) return null;
  return (
    <div className="app-lock" role="dialog" aria-modal="true" aria-label={t("Uygulama kilitli")}>
      <img className="app-lock-logo" src="/logo.svg" alt="" />
      <p className="app-lock-title">Hesabım</p>
      {locked && (
        <button type="button" className="app-lock-btn" onClick={() => void unlock()}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M7 11V8a5 5 0 0 1 10 0v3M5 11h14v10H5z" />
          </svg>
          {t("Kilidi aç")}
        </button>
      )}
    </div>
  );
}
