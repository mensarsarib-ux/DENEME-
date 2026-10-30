import { t } from "../lib/i18n";
import { PRIVACY_ICON } from "../lib/menu";
import PageHeader from "./PageHeader";

/** Gizlilik politikası: verilerin neden ve nasıl kullanıldığı, satın alma ve hesap silme */
export default function PrivacyPage({ onBack }: { onBack: () => void }) {
  return (
    <div className="cust-page">
      <PageHeader title={t("Gizlilik politikası")} subtitle={t("Verilerinizin nasıl kullanıldığı")} icon={PRIVACY_ICON} onBack={onBack} />
      <div className="stack">
        <section className="card" aria-label={t("Gizlilik politikası")}>
          <h2 className="card-title">{t("Hangi veriler kullanılır?")}</h2>
          <p>{t("İşletme bilgileriniz, müşteri ve tedarikçi kayıtlarınız, işlemleriniz ve notlarınız. Hesap oluşturduğunuzda e-posta adresiniz ve telefon numaranız da kullanılır.")}</p>
          <h2 className="card-title">{t("Veriler nerede tutulur?")}</h2>
          <p>{t("Veriler öncelikle bu cihazda saklanır. Hesabınızla giriş yaptığınızda aynı veriler, yalnızca sizin erişebildiğiniz bir bulut hesabında (Supabase) tutulup cihazlarınız arasında eşitlenir.")}</p>
          <h2 className="card-title">{t("Veriler nasıl kullanılır?")}</h2>
          <p>{t("Veriler yalnızca uygulamanın çalışması için kullanılır: kayıtları göstermek, raporlar üretmek ve eşitlemek. Verileriniz reklam amacıyla kullanılmaz ve satılmaz.")}</p>
          <h2 className="card-title">{t("Satın alma ve abonelik")}</h2>
          <p>{t("Paket ödemeleri Apple üzerinden yapılır; kart bilgilerinize uygulama erişmez. Abonelik iptali için iPhone'unuzda Ayarlar → Apple Hesabı → Abonelikler bölümünü kullanın.")}</p>
          <h2 className="card-title">{t("Hesap ve veri silme")}</h2>
          <p>{t("Ayarlar bölümündeki Hesabımı sil ile hesabınızı ve tüm bulut verilerinizi kalıcı olarak silebilirsiniz. Sahibi olduğunuz işletmeler ve o işletmelerdeki üyelikler de silinir. Bu işlem geri alınamaz.")}</p>
          <h2 className="card-title">{t("Veri kontrolü")}</h2>
          <p>{t("Ayarlar → Veriler bölümünden yedek alabilir, verilerinizi geri yükleyebilirsiniz.")}</p>
          <h2 className="card-title">{t("Üçüncü taraflar")}</h2>
          <p>{t("Satın alma işlemleri Apple, veri barındırma Supabase üzerinden yapılır. Bunların dışında verileriniz paylaşılmaz.")}</p>
          <h2 className="card-title">{t("İletişim")}</h2>
          <p>{t("Sorularınız için Destek al bölümünü kullanabilirsiniz.")}</p>
          <p>
            <a href="https://hesabimmuhasebe.com/kvkk.html" target="_blank" rel="noreferrer">{t("KVKK Aydınlatma Metni")}</a>
          </p>
        </section>
      </div>
    </div>
  );
}
