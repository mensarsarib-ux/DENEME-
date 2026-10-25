import { t } from "../lib/i18n";

/** Katılma isteği onay bekliyorsa veya reddedildiyse gösterilen ekran */
export default function WaitingScreen({
  status,
  onRecheck,
  onLogout,
}: {
  status: string | null;
  onRecheck: () => void;
  onLogout: () => void;
}) {
  const rejected = status === "rejected";
  return (
    <div className="auth-page">
      <section className="auth-card">
        <h1>{rejected ? t("İstek reddedildi") : t("Onay bekleniyor")}</h1>
        <p className="auth-sub">
          {rejected
            ? t("Yetkili isteğinizi reddetti. Yetkiliyle iletişime geçin.")
            : t("İşletme yetkilisi isteğinizi onayladığında uygulama açılacak.")}
        </p>
        {!rejected && (
          <button type="button" className="primary-btn" onClick={onRecheck}>
            {t("YENİDEN KONTROL ET")}
          </button>
        )}
        <button type="button" className="help-link" onClick={onLogout}>
          {t("Çıkış yap")}
        </button>
      </section>
    </div>
  );
}
