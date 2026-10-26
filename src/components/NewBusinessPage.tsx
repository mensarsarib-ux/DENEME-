import { useState, type FormEvent } from "react";
import type { Profile } from "../data/mock";
import { t } from "../lib/i18n";
import { createWorkspace } from "../lib/storage";
import { createBusiness, loadSession } from "../lib/cloud";
import PageHeader from "./PageHeader";
import { SUPPORT_ICON } from "../lib/menu";
import PhoneField from "./PhoneField";

/** Yeni işletme formu: işletme profili ile aynı bilgiler; kaydedilince bomboş yeni bir işletme açılır */
export default function NewBusinessPage({ onBack, onJoin }: { onBack: () => void; onJoin: () => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");

  const [notice, setNotice] = useState<string | null>(null);
  const ready = name.trim() !== "";

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!ready) return;
    const profile: Profile = {
      name: name.trim(),
      owner: "",
      phone: phone.trim(),
      email: email.trim(),
      address: address.trim(),
      taxNo: "",
    };
    // Sunucuda da açılır (ekip üyeleri görür); aynı kimlik yerel çalışma alanında kullanılır
    const session = loadSession();
    if (!session) {
      setNotice(t("Ekip paylaşımı için giriş yapmanız gerekir; işletme yalnızca bu cihazda açılacak."));
    }
    let serverId: string | undefined;
    if (session) {
      try {
        const r = await createBusiness(session, profile.name);
        if (typeof r === "string") serverId = r;
        else setNotice(t("Oturum sona ermiş; yeniden giriş yapın."));
      } catch (e) {
        const detail = e instanceof Error ? e.message : String(e);
        setNotice(t("Sunucuya kaydedilemedi: {d}", { d: detail }));
        return;
      }
    }
    createWorkspace(profile.name, profile, serverId);
    window.location.reload();
  }

  return (
    <div className="cust-page">
      <PageHeader title={t("Yeni işletme")} subtitle={t("İşletme bilgilerini girin")} icon={SUPPORT_ICON} onBack={onBack} />
      <form className="form" onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor="nb-name">{t("İşletme adı")}</label>
          <input id="nb-name" autoComplete="off" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="nb-phone">{t("Telefon")}</label>
          <PhoneField id="nb-phone" value={phone} onChange={setPhone} autoComplete="off" />
        </div>
        <div className="field">
          <label htmlFor="nb-email">{t("E-posta")}</label>
          <input id="nb-email" type="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="nb-address">{t("Adres")}</label>
          <textarea id="nb-address" rows={2} value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>
        {notice && <p className="form-error" role="alert">{notice}</p>}
        <button className="primary-btn" type="submit" disabled={!ready}>
          {t("İŞLETMEYİ OLUŞTUR")}
        </button>
        <button type="button" className="help-link" onClick={onJoin}>
          {t("Var olan işletmeye katıl")}
        </button>
      </form>
    </div>
  );
}
