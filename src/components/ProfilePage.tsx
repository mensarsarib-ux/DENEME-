import { useEffect, useState, type FormEvent } from "react";
import type { Profile } from "../data/mock";
import { haptic } from "../lib/haptics";
import { MENU_ITEMS } from "../lib/menu";
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
    });
    setSaved(true);
  }

  return (
    <div className="cust-page">
      <PageHeader
        title="İşletme profili"
        subtitle="Adınız ve iletişim bilgileriniz"
        icon={ICON}
        onBack={onBack}
        action={
          <button className="header-add" type="submit" form="profile-form" disabled={!dirty}>
            KAYDET
          </button>
        }
      />

      <form id="profile-form" className="form" onSubmit={submit} noValidate>
        <div className="profile-preview" aria-live="polite">
          <span className="company-logo" aria-hidden="true">
            <img src="/logo.svg" alt="" />
          </span>
          <span className="company-text">
            <strong>{draft.name.trim() || "Hesabım"}</strong>
            <small>{draft.owner.trim() || draft.email.trim() || "Şirket adınız"}</small>
          </span>
        </div>
        <p className="field-hint">Üst çubukta bu şekilde görünür.</p>

        <div className="field">
          <label htmlFor="pf-name">İşletme adı</label>
          <input id="pf-name" autoComplete="off" value={draft.name} onChange={(e) => set("name")(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="pf-owner">Yetkili</label>
          <input id="pf-owner" autoComplete="off" value={draft.owner} onChange={(e) => set("owner")(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="pf-phone">Telefon</label>
          <input id="pf-phone" type="tel" inputMode="tel" autoComplete="off" value={draft.phone} onChange={(e) => set("phone")(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="pf-email">E-posta</label>
          <input id="pf-email" type="email" autoComplete="off" value={draft.email} onChange={(e) => set("email")(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="pf-address">Adres</label>
          <textarea id="pf-address" rows={2} value={draft.address} onChange={(e) => set("address")(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="pf-tax">Vergi numarası</label>
          <input id="pf-tax" inputMode="numeric" autoComplete="off" value={draft.taxNo} onChange={(e) => set("taxNo")(e.target.value)} />
        </div>

        {saved && (
          <p className="form-success" role="status">
            Profil kaydedildi.
          </p>
        )}
      </form>
    </div>
  );
}
