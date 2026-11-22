import { useEffect, useState } from "react";
import { Share } from "@capacitor/share";
import { cancelInvite, CloudError, inviteMember, normalizePhone, sentInvites, teamPeople, type SentInvite, type Session, type TeamPerson, displayIdentity } from "../lib/cloud";
import PhoneField from "./PhoneField";
import { t } from "../lib/i18n";
import { haptic } from "../lib/haptics";
import { SUPPORT_ICON } from "../lib/menu";
import { canUseTeam } from "../lib/plan";
import { contactPickerAvailable, pickContact } from "../lib/contacts";
import PageHeader from "./PageHeader";

/** Davet mesajındaki bağlantı */
const SITE_URL = "https://hesabimmuhasebe.com";

/**
 * Ekiplerim: yetkili çalışanını telefon numarasıyla davet eder; bekleyen davetler ve ekip üyeleri listelenir
 * (üyeye dokununca erişimleri açılır). Davet edilen kişi o numarayla uygulamaya girince "Katıl" der.
 * Ekip üyesi bu sayfada yalnızca ekibin yetkili tarafından yönetildiğini görür.
 */
export default function TeamPage({
  session,
  businessId,
  isMember,
  onOpen,
  onPlans,
  onBack,
}: {
  session: Session;
  /** Davetin yapılacağı (yetkilinin açık) işletmesi */
  businessId: string | null;
  /** Ortak işletmede üye olarak mı çalışıyor (ekibi yetkili yönetir) */
  isMember: boolean;
  onOpen: (person: TeamPerson) => void;
  /** Paketlere geç sayfası */
  onPlans: () => void;
  onBack: () => void;
}) {
  const [people, setPeople] = useState<TeamPerson[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [invites, setInvites] = useState<SentInvite[]>([]);
  const [phoneInput, setPhoneInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  // Az önce davet edilen numara: "Mesajla haber ver" bu kişiye gider
  const [invited, setInvited] = useState<string | null>(null);
  const phone = normalizePhone(phoneInput) ?? "";

  function loadInvites() {
    sentInvites(session)
      .then((r) => r !== "expired" && setInvites(r ?? []))
      .catch(() => undefined);
  }
  useEffect(() => {
    if (isMember) return;
    teamPeople(session)
      .then((r) => (r === "expired" ? setFailed(true) : setPeople(r)))
      .catch(() => setFailed(true));
    loadInvites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, isMember]);

  // Davet edilen kişiye gönderilen mesaj: uygulamayı indirip bu numarayla girmesi yeterli
  const inviteText = t("Hesabım Muhasebe'de seni ekibime ekledim. Uygulamayı indir ve bu telefon numarasıyla giriş yap: {url}", { url: SITE_URL });

  /** Rehberden kişi seçilince numarası kutuya yazılır */
  async function fromContacts() {
    haptic("light");
    const picked = await pickContact();
    if (picked?.phone) setPhoneInput(picked.phone);
  }

  async function invite() {
    if (!phone || !businessId || busy) return;
    haptic("light");
    setBusy(true);
    setMessage(null);
    try {
      const r = await inviteMember(session, businessId, phone);
      if (r === "expired") throw new CloudError("unknown", "expired");
      haptic("success");
      setInvited(phone);
      setPhoneInput("");
      setMessage({ ok: true, text: t("{p} davet edildi. Bu numarayla uygulamaya girince ekibinize katılır.", { p: phone }) });
      loadInvites();
    } catch {
      haptic("warning");
      setMessage({ ok: false, text: t("Davet gönderilemedi. Bağlantınızı kontrol edip tekrar deneyin.") });
    } finally {
      setBusy(false);
    }
  }

  async function cancel(id: string) {
    haptic("light");
    await cancelInvite(session, id).catch(() => undefined);
    loadInvites();
  }

  /** Davet edilen kişiye SMS ile haber verilir (uygulama bağlantısıyla); olmazsa paylaşım penceresi */
  function notify(to: string) {
    haptic("light");
    window.location.href = `sms:${to}&body=${encodeURIComponent(inviteText)}`;
  }

  async function shareInvite() {
    haptic("light");
    try {
      await Share.share({ title: t("Ekip davetiyesi"), text: inviteText });
    } catch {
      // Paylaşım penceresi kapatıldıysa ya da desteklenmiyorsa metin panoya kopyalanır
      try {
        await navigator.clipboard.writeText(inviteText);
        setCopied(true);
      } catch {
        /* kopyalanamazsa metin ekranda görünür */
      }
    }
  }

  if (isMember) {
    return (
      <div className="cust-page">
        <PageHeader title={t("Ekiplerim")} subtitle={t("Ekip üyeleri ve işletme erişimleri")} icon={SUPPORT_ICON} onBack={onBack} />
        <div className="stack">
          <section className="card" aria-label={t("Ekip")}>
            <p>{t("Bu işletmenin ekibini ve paketini işletme yetkilisi yönetir. Yeni bir ekip arkadaşı eklemek için yetkiliyle konuşun.")}</p>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="cust-page">
      <PageHeader title={t("Ekiplerim")} subtitle={t("Ekip üyeleri ve işletme erişimleri")} icon={SUPPORT_ICON} onBack={onBack} />
      <div className="stack">
        {!canUseTeam() ? (
          <section className="card" aria-label={t("Paketlere geç")}>
            <p>{t("Ekip ve paylaşım için paketlere geçin.")}</p>
            <button type="button" className="primary-btn" onClick={onPlans}>{t("Paketlere geç")}</button>
          </section>
        ) : (
          <>
          <section className="card" aria-label={t("Ekip üyesi ekle")}>
            <h2 className="card-title">{t("Ekip üyesi ekle")}</h2>
            <p className="field-hint">{t("Çalışanınızın telefon numarasını yazın. Uygulamayı indirip bu numarayla girdiğinde ekibinize katılır.")}</p>
            <div className="field">
              <label htmlFor="team-invite-phone">{t("Telefon")}</label>
              <PhoneField id="team-invite-phone" value={phoneInput} onChange={setPhoneInput} />
            </div>
            {contactPickerAvailable() && (
              <button type="button" className="help-link" onClick={() => void fromContacts()}>{t("Rehberden seç")}</button>
            )}
            <button type="button" className="primary-btn" disabled={!phone || !businessId || busy} onClick={() => void invite()}>
              {busy ? t("Bekleyin…") : t("DAVET ET")}
            </button>
            {message && <p className={message.ok ? "form-success" : "form-error"} role="status">{message.text}</p>}
            {invited && message?.ok && (
              <div className="card-actions">
                <button type="button" className="action-btn" onClick={() => notify(invited)}>{t("SMS ile haber ver")}</button>
                <button type="button" className="action-btn" onClick={() => void shareInvite()}>{t("Paylaş")}</button>
              </div>
            )}
            {copied && <p className="form-success" role="status">{t("Davet mesajı kopyalandı.")}</p>}
          </section>
          {invites.length > 0 && (
            <section className="card" aria-label={t("Bekleyen davetler")}>
              <h2 className="card-title">{t("Bekleyen davetler")}</h2>
              {invites.map((inv) => (
                <div key={inv.id} className="team-row">
                  <span className="team-row-email">{inv.phone}</span>
                  <button type="button" className="help-link" onClick={() => void cancel(inv.id)}>{t("İptal")}</button>
                </div>
              ))}
            </section>
          )}
        </>
        )}
        <section className="card" aria-label={t("Ekip üyeleri")}>
          {failed && <p className="form-error" role="alert">{t("Ekip bilgileri yüklenemedi.")}</p>}
          {!failed && people === null && <p className="card-empty">{t("Yükleniyor…")}</p>}
          {people && people.length === 0 && <p className="card-empty">{t("Henüz ekip üyeniz yok.")}</p>}
          {people &&
            people.map((p) => (
              <button
                key={p.user_id}
                type="button"
                className="team-row"
                onClick={() => {
                  haptic("light");
                  onOpen(p);
                }}
              >
                <span className="team-row-email">{displayIdentity(p.email)}</span>
                <span aria-hidden="true">›</span>
              </button>
            ))}
        </section>
      </div>
    </div>
  );
}
