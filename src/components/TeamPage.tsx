import { useEffect, useState } from "react";
import { Share } from "@capacitor/share";
import { teamPeople, type Session, type TeamPerson } from "../lib/cloud";
import { t } from "../lib/i18n";
import { haptic } from "../lib/haptics";
import { SUPPORT_ICON } from "../lib/menu";
import { canUseTeam } from "../lib/plan";
import PageHeader from "./PageHeader";

/** Davet mesajındaki bağlantı */
const SITE_URL = "https://hesabimmuhasebe.com";

/**
 * Ekiplerim: yetkili için davet yolu ve ekip üyelerinin listesi (birine dokununca erişimleri açılır).
 * Ekip üyesi bu sayfada yalnızca ekibin yetkili tarafından yönetildiğini görür.
 */
export default function TeamPage({
  session,
  isMember,
  onOpen,
  onPlans,
  onBack,
}: {
  session: Session;
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

  useEffect(() => {
    if (isMember) return;
    teamPeople(session)
      .then((r) => (r === "expired" ? setFailed(true) : setPeople(r)))
      .catch(() => setFailed(true));
  }, [session, isMember]);

  const inviteText = t(
    "Hesabım Muhasebe'de işletmeme katıl: uygulamayı indir, giriş ekranında Katıl sekmesine benim e-postamı yaz: {m} — {url}",
    { m: session.email, url: SITE_URL },
  );

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
          <section className="card" aria-label={t("Ekip arkadaşını davet et")}>
            <h2 className="card-title">{t("Ekip arkadaşını davet et")}</h2>
            <ol className="invite-steps">
              <li>{t("Ekip arkadaşınız Hesabım uygulamasını indirsin.")}</li>
              <li>{t("Giriş ekranında Katıl sekmesine sizin e-postanızı yazsın: {m}", { m: session.email })}</li>
              <li>{t("İstek Bildirimler'e gelir; onayladığınızda işletmenizi birlikte kullanırsınız.")}</li>
            </ol>
            <button type="button" className="primary-btn" onClick={() => void shareInvite()}>{t("Davet mesajını paylaş")}</button>
            {copied && <p className="form-success" role="status">{t("Davet mesajı kopyalandı.")}</p>}
          </section>
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
                <span className="team-row-email">{p.email}</span>
                <span aria-hidden="true">›</span>
              </button>
            ))}
        </section>
      </div>
    </div>
  );
}
