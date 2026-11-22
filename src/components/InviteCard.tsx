import { useEffect, useState } from "react";
import { acceptInvite, CloudError, declineInvite, myInvites, type Session, type TeamInvite } from "../lib/cloud";
import { haptic } from "../lib/haptics";
import { t } from "../lib/i18n";
import { switchWorkspace } from "../lib/storage";

/**
 * Giriş yapmış kişiye gelen ekip daveti: ana ekranın üstünde kart ("Katıl" / "Reddet").
 * Davetler uygulama açılınca ve uygulamaya geri dönülünce kontrol edilir (sürekli sorulmaz).
 */
export default function InviteCard({ session }: { session: Session }) {
  const [invites, setInvites] = useState<TeamInvite[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const check = () => {
      if (document.visibilityState !== "visible") return;
      myInvites(session)
        .then((r) => alive && r !== "expired" && setInvites(r))
        .catch(() => undefined);
    };
    check();
    document.addEventListener("visibilitychange", check);
    return () => {
      alive = false;
      document.removeEventListener("visibilitychange", check);
    };
  }, [session]);

  const invite = invites[0];
  if (!invite) return null;

  async function accept() {
    if (busy) return;
    haptic("light");
    setBusy(true);
    setError(null);
    try {
      const r = await acceptInvite(session, invite.id);
      if (r === "expired") throw new CloudError("unknown", "expired");
      haptic("success");
      // Katılınca yetkilinin işletmesi açılır (kendi işletmesi Menü'deki listede kalır)
      if (invite.businessId) switchWorkspace(invite.businessId);
      else window.location.reload();
    } catch (e) {
      haptic("warning");
      setError(
        e instanceof CloudError && e.code === "team_limit"
          ? t("Bu işletmenin ekibi dolu. Yetkilinin paketini yükseltmesi gerekiyor.")
          : t("Bir sorun oluştu; biraz sonra tekrar deneyin."),
      );
      setBusy(false);
    }
  }

  async function decline() {
    if (busy) return;
    haptic("light");
    setBusy(true);
    await declineInvite(session, invite.id).catch(() => undefined);
    setInvites((list) => list.slice(1));
    setBusy(false);
  }

  return (
    <div className="invite-card" role="dialog" aria-label={t("Ekip daveti")}>
      <strong>{t("{b} sizi ekibine davet etti", { b: invite.businessName })}</strong>
      <small>{t("Katılırsanız işletmenin kayıtlarını ekip üyesi olarak görürsünüz.")}</small>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="invite-card-actions">
        <button type="button" className="action-btn" disabled={busy} onClick={() => void decline()}>
          {t("Reddet")}
        </button>
        <button type="button" className="primary-btn" disabled={busy} onClick={() => void accept()}>
          {t("Katıl")}
        </button>
      </div>
    </div>
  );
}
