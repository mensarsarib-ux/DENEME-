import { useState, type FormEvent } from "react";
import { findBusinessByOwnerEmail, normalizePhone, requestJoin, type Session } from "../lib/cloud";
import { haptic } from "../lib/haptics";
import { t } from "../lib/i18n";

/**
 * Ekibe katılma isteği gönderen kişinin ekranı. Beklerken: onay bekleniyor ve tekrar kontrol.
 * Reddedilince: başka bir yetkiliye istek gönderme ya da kendi işletmesini açma.
 */
export default function WaitingScreen({
  session,
  status,
  onRecheck,
  onOwnBusiness,
  onLogout,
}: {
  session: Session;
  status: string | null;
  onRecheck: () => void;
  /** Kendi işletmesini açar ve uygulamaya geçer */
  onOwnBusiness: () => Promise<void>;
  onLogout: () => void;
}) {
  const rejected = status === "rejected";
  const [owner, setOwner] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ownerId = owner.includes("@") ? owner.trim() : normalizePhone(owner) ?? "";
  const validOwner = ownerId.includes("@") ? /^\S+@\S+\.\S+$/.test(ownerId) : ownerId !== "";

  async function sendAgain(event: FormEvent) {
    event.preventDefault();
    if (busy || !validOwner) return;
    setBusy(true);
    setError(null);
    try {
      const found = await findBusinessByOwnerEmail(session, ownerId);
      if (found === "expired") return onLogout();
      if (found.length === 0) {
        haptic("warning");
        setError(t("Bu e-posta ya da telefona ait bir işletme bulunamadı."));
        return;
      }
      await requestJoin(session, found[0].id);
      haptic("success");
      onRecheck();
    } catch {
      haptic("warning");
      setError(t("Bir sorun oluştu; biraz sonra tekrar deneyin."));
    } finally {
      setBusy(false);
    }
  }

  async function ownBusiness() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await onOwnBusiness();
    } catch {
      setError(t("Bir sorun oluştu; biraz sonra tekrar deneyin."));
      setBusy(false);
    }
  }

  return (
    <div className="ob-page">
      <form className="ob-sheet is-done" onSubmit={sendAgain} noValidate>
        <div className={`ob-check ${rejected ? "is-rejected" : "is-wait"}`} aria-hidden="true">
          {rejected ? "✕" : "⏳"}
        </div>
        <h2 className="ob-heading">{rejected ? t("İsteğiniz reddedildi") : t("Onay bekleniyor")}</h2>
        <p className="ob-lead">
          {rejected
            ? t("Yetkili isteğinizi onaylamadı. Başka bir yetkiliye istek gönderebilir ya da kendi işletmenizi açabilirsiniz.")
            : t("İşletme yetkilisi isteğinizi onayladığında işletmeye erişiminiz açılır.")}
        </p>
        {rejected && (
          <div className="field ob-wait-field">
            <label htmlFor="wait-owner">{t("Yetkilinin e-postası veya telefonu")}</label>
            <input
              id="wait-owner"
              type="text"
              inputMode="email"
              autoCapitalize="none"
              autoCorrect="off"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
            />
          </div>
        )}
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="ob-spacer" />
        {rejected ? (
          <>
            <button className="primary-btn" type="submit" disabled={busy || !validOwner}>
              {t("BAŞKA BİR YETKİLİYE İSTEK GÖNDER")}
            </button>
            <button type="button" className="action-btn is-center ob-wide" disabled={busy} onClick={() => void ownBusiness()}>
              {t("Kendi işletmemi aç")}
            </button>
          </>
        ) : (
          <button type="button" className="primary-btn" onClick={onRecheck}>
            {t("YENİDEN KONTROL ET")}
          </button>
        )}
        <button type="button" className="help-link" onClick={onLogout}>
          {t("Çıkış yap")}
        </button>
      </form>
    </div>
  );
}
