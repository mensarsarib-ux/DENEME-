import { t } from "../lib/i18n";

export type GuestStart = "welcome" | "reg-business" | "login" | "join-phone";

/**
 * Misafir ana sayfada bir yere dokunduğunda çıkan kapı: arkada karartılmış ana sayfa, üstte logo ve
 * Giriş yap, Üye ol, Ekibe katıl. Bunlardan biri seçilmeden ana sayfaya dönülmez.
 */
export default function GuestWelcome({
  onAccount,
}: {
  onAccount: (start: GuestStart) => void;
}) {
  return (
    <div className="ob-page ob-welcome guest-welcome" role="dialog" aria-modal="true" aria-label={t("Hesabınızı oluşturun")}>
      <div className="ob-hero">
        <img className="ob-logo" src="/logo.svg" alt="" />
        <h1 className="ob-title">Hesabım Muhasebe</h1>
        <p className="ob-tagline">{t("Cari hesap, kasa ve ekibiniz tek uygulamada")}</p>
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
      </div>
    </div>
  );
}
