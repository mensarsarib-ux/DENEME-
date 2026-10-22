import { t } from "../lib/i18n";
export default function Splash() {
  return (
    <div className="splash">
      <img className="splash-logo" src="/logo.svg" alt={t("Hesabım logosu")} />
      <h1 className="splash-title">{t("Hesabım")}</h1>
    </div>
  );
}
