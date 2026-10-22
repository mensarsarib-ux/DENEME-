import { useEffect, useState, type FormEvent } from "react";
import type { Profile } from "../data/mock";
import { haptic } from "../lib/haptics";
import { t } from "../lib/i18n";
import { MENU_ITEMS } from "../lib/menu";
import { resizeImage } from "../lib/logo";
import CompanyLogo from "./CompanyLogo";
import PageHeader from "./PageHeader";

const ICON = MENU_ITEMS[0].icon;

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

  const dirty = (Object.keys(profile) as (keyof Profile)[]).some(
    (k) => profile[k] !== draft[k],
  );

  const [photoError, setPhotoError] = useState(false);

  async function pickPhoto(file: File | undefined) {
    if (!file) return;
    try {
      const logo = await resizeImage(file);
      setDraft((d) => ({ ...d, logo }));
      setSaved(false);
      setPhotoError(false);
      haptic("light");
    } catch {
      setPhotoError(true);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!dirty) return;
    haptic("success");
    onSave({
      name: draft.name.trim(),
      owner: draft.owner.trim(),
      phone: draft.phone.trim(),
      email: draft.email.trim(),
      address: draft.address.trim(),
      taxNo: draft.taxNo.trim(),
      logo: draft.logo,
    });
    setSaved(true);
  }

  return (
    <div className="cust-page">
      <PageHeader
        title={t("İşletme profili")}
        subtitle={t("Adınız ve iletişim bilgileriniz")}
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
            <small>{draft.owner.trim() || draft.email.trim() || t("Şirket adınız")}</small>
          </span>
        </div>
        <p className="field-hint">{t("Üst çubukta bu şekilde görünür.")}</p>

        <div className="photo-picker">
          <CompanyLogo logo={draft.logo} name={draft.name} size={88} />
          <div className="photo-actions">
            <label className="action-btn photo-btn">
              {t("Fotoğraf seç")}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  void pickPhoto(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </label>
            {draft.logo && (
              <button
                type="button"
                className="action-btn is-danger"
                onClick={() => {
                  setDraft((d) => ({ ...d, logo: "" }));
                  setSaved(false);
                }}
              >
                {t("Fotoğrafı kaldır")}
              </button>
            )}
          </div>
          {photoError && (
            <p className="form-error" role="alert">
              {t("Bu dosya okunamadı; başka bir fotoğraf deneyin.")}
            </p>
          )}
        </div>

        <div className="field">
          <label htmlFor="pf-name">{t("İşletme adı")}</label>
          <input id="pf-name" autoComplete="off" value={draft.name} onChange={(e) => set("name")(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="pf-owner">{t("Yetkili")}</label>
          <input id="pf-owner" autoComplete="off" value={draft.owner} onChange={(e) => set("owner")(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="pf-phone">{t("Telefon")}</label>
          <input id="pf-phone" type="tel" inputMode="tel" autoComplete="off" value={draft.phone} onChange={(e) => set("phone")(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="pf-email">{t("E-posta")}</label>
          <input id="pf-email" type="email" autoComplete="off" value={draft.email} onChange={(e) => set("email")(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="pf-address">{t("Adres")}</label>
          <textarea id="pf-address" rows={2} value={draft.address} onChange={(e) => set("address")(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="pf-tax">{t("Vergi numarası")}</label>
          <input id="pf-tax" inputMode="numeric" autoComplete="off" value={draft.taxNo} onChange={(e) => set("taxNo")(e.target.value)} />
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
