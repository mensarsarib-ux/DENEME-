import { useEffect, useState, type FormEvent } from "react";
import type { Profile } from "../data/mock";
import { haptic } from "../lib/haptics";
import { t } from "../lib/i18n";
import { MENU_ITEMS } from "../lib/menu";
import CompanyLogo from "./CompanyLogo";
import PageHeader from "./PageHeader";
import PhoneField from "./PhoneField";

const ICON = MENU_ITEMS.find((m) => m.page === "profile")!.icon;

/** İşletme profili: ad ve iletişim bilgileri düzenlenir; ad ve yetkili üst çubukta görünür */
export default function ProfilePage({
  profile,
  onSave,
  onBack,
}: {
  profile: Profile;
  onSave: (profile: Profile) => void;
  onBack: () => void;
}) {
  const [draft, setDraft] = useState<Profile>(profile);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!saved) return;
    const timer = window.setTimeout(() => setSaved(false), 2200);
    return () => window.clearTimeout(timer);
  }, [saved]);

  const set = (key: keyof Profile) => (value: string) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setSaved(false);
  };

  // "logo" eski kayıtlarda hiç bulunmayabilir; bu yüzden anahtarlar elle sayılır
  const FIELDS: (keyof Profile)[] = ["name", "phone", "email", "address"];
  const dirty = FIELDS.some((k) => (profile[k] ?? "") !== (draft[k] ?? ""));


  // Seçilen fotoğraf, daireye yerleştirilmesi için kırpma penceresinde açılır

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!dirty) return;
    haptic("success");
    // Yalnızca firma adı ve iletişim bilgileri; logo artık firma adının baş harflerinden üretilir
    onSave({
      ...draft,
      logo: undefined,
      name: draft.name.trim(),
      phone: draft.phone.trim(),
      email: draft.email.trim(),
      address: draft.address.trim(),
    });
    setSaved(true);
  }

  return (
    <div className="cust-page">
      <PageHeader
        title={t("İşletme profili")}
        icon={ICON}
        onBack={onBack}
        action={
          <button className="header-add" type="submit" form="profile-form" disabled={!dirty}>
            {t("KAYDET")}
          </button>
        }
      />

      <form id="profile-form" className="form" onSubmit={submit} noValidate>
        <div className="profile-preview" aria-live="polite">
          <CompanyLogo logo={draft.logo} name={draft.name} size={44} />
          <span className="company-text">
            <strong>{draft.name.trim() || t("Hesabım")}</strong>
          </span>
        </div>

        <div className="field">
          <label htmlFor="pf-name">{t("İşletme adı")}</label>
          <input id="pf-name" autoComplete="off" value={draft.name} onChange={(e) => set("name")(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="pf-phone">{t("Telefon")}</label>
          <PhoneField id="pf-phone" value={draft.phone} onChange={set("phone")} autoComplete="off" />
        </div>
        <div className="field">
          <label htmlFor="pf-email">{t("E-posta")}</label>
          <input id="pf-email" type="email" autoComplete="off" value={draft.email} onChange={(e) => set("email")(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="pf-address">{t("Adres")}</label>
          <textarea id="pf-address" rows={2} value={draft.address} onChange={(e) => set("address")(e.target.value)} />
        </div>

        {saved && (
          <p className="form-success" role="status">
            {t("Profil kaydedildi.")}
          </p>
        )}
      </form>

    </div>
  );
}
