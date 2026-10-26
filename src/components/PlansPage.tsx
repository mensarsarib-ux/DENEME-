import type { Profile } from "../data/mock";
import { t } from "../lib/i18n";
import { haptic } from "../lib/haptics";
import { activeWorkspace, listWorkspaces, MAIN_WORKSPACE, switchWorkspace } from "../lib/storage";
import { SUPPORT_ICON } from "../lib/menu";
import CompanyLogo from "./CompanyLogo";
import PageHeader from "./PageHeader";

/** Paket seçenekleri ve sınırları (plan.ts ile aynı değerler) */
const PLANS: { name: string; lines: string[] }[] = [
  {
    name: "Pro",
    lines: ["2 işletme", "8 sekme (Müşteriler ve Tedarikçiler dahil)", "Her listede 20 kayıt", "3 ekip üyesi (yönetici dahil)"],
  },
  {
    name: "Pro Plus",
    lines: ["4 işletme", "10 sekme (Müşteriler ve Tedarikçiler dahil)", "Her listede 40 kayıt", "5 ekip üyesi (yönetici dahil)"],
  },
  {
    name: "Premium",
    lines: ["Sınırsız işletme", "Sınırsız sekme", "Sınırsız kayıt", "Sınırsız ekip"],
  },
];

/** İşletme paketleri sayfası: mevcut işletme ve üst pakete geçiş seçenekleri */
export default function PlansPage({ profile, onBack }: { profile: Profile; onBack: () => void }) {
  const name = profile.name || t("Hesabım");
  const active = activeWorkspace();
  const others = listWorkspaces();

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
            {active !== MAIN_WORKSPACE && (
              <button type="button" className="plans-item" onClick={() => switchWorkspace(MAIN_WORKSPACE)}>
                <span>{t("Ana işletme")}</span>
              </button>
            )}
            {others
              .filter((w) => w.id !== active)
              .map((w) => (
                <button key={w.id} type="button" className="plans-item" onClick={() => switchWorkspace(w.id)}>
                  <span>{w.name}</span>
                </button>
              ))}
            {active !== MAIN_WORKSPACE && <small className="plans-note">{t("Şu an bu işletmedesiniz: {n}", { n: name })}</small>}
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
