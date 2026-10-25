import { t } from "../lib/i18n";
import { PRIVACY_ICON } from "../lib/menu";
import PageHeader from "./PageHeader";

/** Gizlilik politikası: uygulamanın veri kullanımını açıklar */
export default function PrivacyPage({ onBack }: { onBack: () => void }) {
  return (
    <div className="cust-page">
      <PageHeader title={t("Gizlilik politikası")} subtitle={t("Verilerinizin nasıl kullanıldığı")} icon={PRIVACY_ICON} onBack={onBack} />
      <div className="stack">
        <section className="card" aria-label={t("Gizlilik politikası")}>
          <h2 className="card-title">{t("Hangi veriler kullanılır?")}</h2>
          <p>{t("İşletme bilgileriniz, müşteri ve tedarikçi kayıtları, işlemleriniz ve notlarınız. Hesap oluşturduğunuzda e-posta adresiniz ve telefon numaranız da kullanılır.")}</p>
          <h2 className="card-title">{t("Veriler nerede tutulur?")}</h2>
          <p>{t("Veriler öncelikle bu cihazda saklanır. Hesabınızla giriş yaptığınızda aynı veriler, yalnızca sizin erişebildiğiniz bir bulut hesabında da tutulup cihazlarınız arasında eşitlenir.")}</p>
          <h2 className="card-title">{t("Veriler nasıl kullanılır?")}</h2>
          <p>{t("Veriler yalnızca uygulamanın çalışması için kullanılır: kayıtları göstermek, raporlar üretmek ve eşitlemek. Verileriniz reklam amacıyla kullanılmaz, üçüncü taraflara satılmaz veya paylaşılmaz.")}</p>
          <h2 className="card-title">{t("Veri kontrolü")}</h2>
          <p>{t("Ayarlar > Veriler bölümünden yedek alabilir, verilerinizi geri yükleyebilir veya tüm verileri silebilirsiniz. Hesabınızı silmek için destek ile iletişime geçin.")}</p>
          <h2 className="card-title">{t("İletişim")}</h2>
          <p>{t("Sorularınız için Destek al bölümünü kullanabilirsiniz.")}</p>
        </section>
      </div>
    </div>
  );
}
