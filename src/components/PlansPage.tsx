import { CURRENT_PLAN, PLAN_NAME, type Plan } from "../lib/plan";
import { t } from "../lib/i18n";
import { SUPPORT_ICON } from "../lib/menu";
import PageHeader from "./PageHeader";

/** Paket kartları: fiyat aylık TL, özellikler kısa ve açık cümlelerle */
const PLANS: {
  id: Plan;
  tagline: string;
  price: number;
  tone: "free" | "pro" | "plus" | "prem";
  badge?: string;
  lines: string[];
}[] = [
  {
    id: "free",
    tagline: "Başlamak için",
    price: 0,
    tone: "free",
    lines: [
      "Bir işletme ile başlayın.",
      "4 sekmeye kadar liste oluşturun.",
      "Her listede 10 kayda kadar kayıt tutun.",
    ],
  },
  {
    id: "pro",
    tagline: "Küçük ekipler için",
    price: 999,
    tone: "pro",
    badge: "EN ÇOK TERCİH EDİLEN",
    lines: [
      "Üç işletmeyi ayrı defterlerde yönetin.",
      "Müşteriler ve tedarikçiler dahil 8 sekmeye kadar liste oluşturun.",
      "Her listede 20 kayda kadar kişi ve firma ekleyin.",
      "Siz dahil üç kişilik bir ekiple birlikte çalışın.",
    ],
  },
  {
    id: "proplus",
    tagline: "Büyüyen işletmeler için",
    price: 1499,
    tone: "plus",
    lines: [
      "Altı işletmeyi tek hesaptan yönetin.",
      "10 sekmeye kadar liste oluşturun.",
      "Her listede 40 kayda kadar kayıt tutun.",
      "Siz dahil beş kişilik bir ekiple çalışın.",
    ],
  },
  {
    id: "premium",
    tagline: "Sınır istemeyenler için",
    price: 1999,
    tone: "prem",
    badge: "SINIRSIZ",
    lines: [
      "İşletme sayısında sınır olmadan çalışın.",
      "Sekme ve kayıt sayısında sınır olmadan kayıt tutun.",
      "Ekip üyesi sınırı olmadan ekibinizi büyütün.",
    ],
  },
];

const price = (value: number) => (value === 0 ? "₺0" : `₺${value.toLocaleString("tr-TR")}`);

/** Üstteki görsel: mağaza, yükselen grafik ve taç; uygulamanın mavi tonlarında */
function Hero() {
  return (
    <svg className="paywall-hero-art" viewBox="0 0 320 120" aria-hidden="true">
      <defs>
        <linearGradient id="pw-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1e3a5f" />
          <stop offset="1" stopColor="#3c8fd9" />
        </linearGradient>
      </defs>
      <rect width="320" height="120" rx="20" fill="url(#pw-bg)" />
      <circle cx="262" cy="26" r="44" fill="#ffffff" opacity="0.07" />
      <circle cx="40" cy="112" r="56" fill="#ffffff" opacity="0.05" />
      <g fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity="0.9">
        <path d="M46 92V58l14-12 14 12v34M42 92h44M61 92V76h10v16M70 66h2M66 66h2" />
      </g>
      <g fill="#ffffff" opacity="0.85">
        <rect x="140" y="78" width="14" height="22" rx="3" />
        <rect x="162" y="64" width="14" height="36" rx="3" />
        <rect x="184" y="50" width="14" height="50" rx="3" />
        <rect x="206" y="38" width="14" height="62" rx="3" />
      </g>
      <path d="M134 44 L152 58 L172 36 L196 52 L224 22" fill="none" stroke="#3fbf82" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M262 30 L270 42 L282 26 L294 42 L302 30 L300 52 L264 52 Z" fill="#d9a441" />
    </svg>
  );
}

/** Paketler sayfası: üstte görsel, altta paket kartları, abonelik bilgisi ve geri yükleme */
export default function PlansPage({ onBack, onPrivacy }: { onBack: () => void; onPrivacy: () => void }) {
  return (
    <div className="cust-page">
      <PageHeader title={t("İşletme paketleri")} subtitle={t("{p} paketini kullanıyorsunuz", { p: PLAN_NAME[CURRENT_PLAN] })} icon={SUPPORT_ICON} onBack={onBack} />
      <div className="paywall">
        <div className="paywall-hero">
          <Hero />
          <h2 className="paywall-title">{t("İşletmeniz büyüdükçe Hesabım da büyüsün")}</h2>
          <p className="paywall-lead">{t("Daha fazla işletme, sekme ve kayıt için paketinizi yükseltin.")}</p>
        </div>

        {PLANS.map((p) => {
          const current = p.id === CURRENT_PLAN;
          return (
            <section key={p.id} className={`paywall-card tone-${p.tone} ${current ? "is-current" : ""}`} aria-label={PLAN_NAME[p.id]}>
              {(current || p.badge) && (
                <span className="paywall-badge">{current ? t("MEVCUT PAKET") : t(p.badge ?? "")}</span>
              )}
              <div className="paywall-top">
                <div>
                  <h3 className="paywall-name">
                    {p.id === "premium" && (
                      <svg className="paywall-crown" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z" />
                      </svg>
                    )}
                    {t(PLAN_NAME[p.id])}
                  </h3>
                  <p className="paywall-tag">{t(p.tagline)}</p>
                </div>
                <p className="paywall-price">
                  {price(p.price)}
                  <small>{p.price === 0 ? t("sonsuza kadar") : t("aylık")}</small>
                </p>
              </div>
              <ul className="paywall-lines">
                {p.lines.map((line) => (
                  <li key={line}>{t(line)}</li>
                ))}
              </ul>
              <button type="button" className="paywall-btn" disabled>
                {current ? t("Kullanılıyor") : t("{p}'ya geç", { p: PLAN_NAME[p.id] })}
              </button>
            </section>
          );
        })}

        <p className="paywall-note">
          {t("Abonelik Apple Kimliğiniz üzerinden ücretlendirilir. Dönem sonunda otomatik olarak yenilenir. Ayarlar → Apple Hesabı → Abonelikler bölümünden en az 24 saat önce iptal edebilirsiniz.")}
        </p>
        <p className="paywall-note">
          {t("Satın almalar henüz açılmadı; abonelikler yakında bu sayfadan başlatılabilecek.")}
        </p>
        <button type="button" className="paywall-restore" disabled>
          {t("Satın alımı geri yükle")}
        </button>
        <button type="button" className="paywall-link" onClick={onPrivacy}>
          {t("Gizlilik politikası")}
        </button>
      </div>
    </div>
  );
}
