import { t } from "../lib/i18n";

export type GuestStart = "welcome" | "reg-business" | "login" | "join-phone";

/**
 * Rehber bittikten sonra çıkan açılış kartı: eski karşılama ekranının aynısı (logo, Giriş yap, Üye ol, Ekibe katıl).
 * Zorunlu değildir; "Şimdilik kendim bakayım" ile panele dönülür.
 */
export default function GuestWelcome({
  onAccount,
  onDismiss,
}: {
  onAccount: (start: GuestStart) => void;
  onDismiss: () => void;
}) {
  return (
    <div className="ob-page ob-welcome guest-welcome" role="dialog" aria-modal="true" aria-label={t("Hesabınızı oluşturun")}>
      <div className="ob-hero">
        <img className="ob-logo" src="/logo.svg" alt="" />
        <h1 className="ob-title">Hesabım Muhasebe</h1>
        <p className="ob-tagline">{t("Cari hesap, kasa ve ekibiniz tek uygulamada")}</p>
        <p className="guest-welcome-note">
          {t("Verileriniz şimdilik yalnızca bu telefonda. Hesap açarsanız kaybolmaz ve diğer cihazlarınızda görünür.")}
        </p>
      </div>
      <div className="ob-actions">
        <button type="button" className="ob-btn is-primary" onClick={() => onAccount("login")}>
          {t("Giriş yap")}
        </button>
        <button type="button" className="ob-btn is-light" onClick={() => onAccount("reg-business")}>
          {t("Üye ol")}
        </button>
        <button type="button" className="ob-btn is-outline" onClick={() => onAccount("join-phone")}>
          {t("Ekibe katıl")}
        </button>
        <button type="button" className="guest-welcome-later" onClick={onDismiss}>
          {t("Şimdilik kendim bakayım")}
        </button>
      </div>
    </div>
  );
}
