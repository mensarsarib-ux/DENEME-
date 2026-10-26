import type { Profile } from "../data/mock";
import { t } from "../lib/i18n";
import { haptic } from "../lib/haptics";
import { activeWorkspace, switchWorkspace } from "../lib/storage";
import { SUPPORT_ICON } from "../lib/menu";
import CompanyLogo from "./CompanyLogo";
import PageHeader from "./PageHeader";

/** Paket seçenekleri ve sınırları (plan.ts ile aynı değerler) */
const PLANS: { name: string; lines: string[] }[] = [
  {
    name: "Pro",
    lines: ["3 işletme", "8 sekme (Müşteriler ve Tedarikçiler dahil)", "Her listede 20 kayıt", "3 ekip üyesi (yönetici dahil)"],
  },
  {
    name: "Pro Plus",
    lines: ["6 işletme", "10 sekme (Müşteriler ve Tedarikçiler dahil)", "Her listede 40 kayıt", "5 ekip üyesi (yönetici dahil)"],
  },
  {
    name: "Premium",
    lines: ["Sınırsız işletme", "Sınırsız sekme", "Sınırsız kayıt", "Sınırsız ekip"],
  },
];

/** İşletme paketleri sayfası: mevcut işletme ve üst pakete geçiş seçenekleri */
export default function PlansPage({
  profile,
  businesses,
  onBack,
}: {
  profile: Profile;
  /** Kullanıcının işletmeleri: bu cihazdakiler ve sunucudaki ortak işletmeler */
  businesses: { id: string; name: string }[];
  onBack: () => void;
}) {
  const name = profile.name || t("Hesabım");
  const active = activeWorkspace();

  return (
    <div className="cust-page">
      <PageHeader title={t("İşletme paketleri")} subtitle={t("Üst pakete geçerek daha fazla işletme ekleyin")} icon={SUPPORT_ICON} onBack={onBack} />
      <div className="stack">
        <section className="card" aria-label={t("Mevcut işletme")}>
          <h2 className="card-title">{t("MEVCUT İŞLETMENİZ")}</h2>
          <div className="plans-current">
            <CompanyLogo logo={profile.logo} name={name} size={40} />
            <span className="plans-current-name">{name}</span>
          </div>
        </section>

        <section className="card" aria-label={t("İşletmelerim")}>
          <h2 className="card-title">{t("İŞLETMELERİM")}</h2>
          <div className="plans-list">
            {businesses.map((b) => {
              const isActive = b.id === active;
              return (
                <button
                  key={b.id}
                  type="button"
                  className="plans-item"
                  disabled={isActive}
                  onClick={() => switchWorkspace(b.id)}
                >
                  <span>{b.name}</span>
                  <small>{isActive ? t("Şu an buradasınız") : t("Geç")}</small>
                </button>
              );
            })}
          </div>
        </section>

        <section className="card" aria-label={t("Üst paketler")}>
          <h2 className="card-title">{t("ÜST PAKETE GEÇ")}</h2>
          <div className="plans-list">
            {PLANS.map((p) => (
              <button
                key={p.name}
                type="button"
                className="plans-item plans-item-detail"
                disabled
                onClick={() => haptic("light")}
              >
                <span className="plans-item-name">{p.name}</span>
                <span className="plans-item-lines">{p.lines.join(" · ")}</span>
                <small>{t("Yakında")}</small>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
