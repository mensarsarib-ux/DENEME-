import { t } from "../lib/i18n";
import { PRIVACY_ICON } from "../lib/menu";
import PageHeader from "./PageHeader";

/** Kullanım koşulları: hizmetin kapsamı, abonelik, sorumluluk ve fesih */
export default function TermsPage({ onBack }: { onBack: () => void }) {
  return (
    <div className="cust-page">
      <PageHeader title={t("Kullanım koşulları")} subtitle={t("Uygulamayı kullanırken geçerli kurallar")} icon={PRIVACY_ICON} onBack={onBack} />
      <div className="stack">
        <section className="card" aria-label={t("Kullanım koşulları")}>
          <h2 className="card-title">{t("Hizmetin kapsamı")}</h2>
          <p>{t("Hesabım, küçük işletmelerin müşteri, tedarikçi, işlem, hesap ve not kayıtlarını tutmasına yardımcı olan bir uygulamadır. Uygulama resmi muhasebe, vergi veya hukuki danışmanlık yerine geçmez.")}</p>
          <h2 className="card-title">{t("Hesap ve sorumluluk")}</h2>
          <p>{t("Hesabınızın güvenliğinden ve girdiğiniz bilgilerin doğruluğundan siz sorumlusunuz. Hesabınızı başkalarıyla paylaşmamanızı öneririz. Ekibinize davet ettiğiniz kişilerin uygulamadaki işlemlerinden de sorumlu olduğunuzu kabul edersiniz.")}</p>
          <h2 className="card-title">{t("Ücretsiz ve ücretli paketler")}</h2>
          <p>{t("Ücretsiz paket sınırlı kullanım sunar. Pro, Pro Plus ve Premium paketleri yıllık abonelik olarak sunulur ve paket sınırları uygulama tarafından gösterilen değerlerle belirlenir.")}</p>
          <h2 className="card-title">{t("Abonelik ve ödeme")}</h2>
          <p>{t("Ücretli paketler Apple Kimliğiniz üzerinden tahsil edilir. Abonelik, dönem sonunda otomatik olarak yenilenir. Yenilemeyi, dönem bitiminden en az 24 saat önce Ayarlar → Apple Hesabı → Abonelikler bölümünden kapatabilirsiniz. Ödenmiş dönemin iadesi Apple'ın kurallarına tabidir.")}</p>
          <h2 className="card-title">{t("Verileriniz")}</h2>
          <p>{t("Verilerinizin nasıl işlendiği, Gizlilik politikası bölümünde açıklanmıştır. Uygulamanın kayıtlarınızı kaybetmemesi için düzenli yedek almanızı öneririz.")}</p>
          <h2 className="card-title">{t("Kullanım kuralları")}</h2>
          <p>{t("Uygulamayı yasalara aykırı amaçlarla, başkalarının verilerini izinsiz kullanarak ya da uygulamanın işleyişini bozacak şekilde kullanamazsınız.")}</p>
          <h2 className="card-title">{t("Sorumluluğun sınırı")}</h2>
          <p>{t("Uygulama olduğu gibi sunulur. Veri kaybı, cihaz veya bağlantı sorunları nedeniyle oluşabilecek zararlardan, yasaların izin verdiği ölçüde sorumlu değiliz.")}</p>
          <h2 className="card-title">{t("Hesabın kapatılması")}</h2>
          <p>{t("Hesabınızı istediğiniz zaman Ayarlar bölümündeki Hesabımı sil seçeneğiyle kapatabilirsiniz. Bu işlem geri alınamaz.")}</p>
          <h2 className="card-title">{t("Değişiklikler")}</h2>
          <p>{t("Bu koşullar değiştirilebilir. Önemli değişikliklerde uygulama içinden bilgilendirme yapılır.")}</p>
          <h2 className="card-title">{t("Uygulanacak hukuk")}</h2>
          <p>{t("Bu koşullar Türkiye Cumhuriyeti hukukuna tabidir. Uyuşmazlıklarda Türkiye'deki yetkili mahkemeler ve icra daireleri yetkilidir.")}</p>
        </section>
      </div>
    </div>
  );
}
