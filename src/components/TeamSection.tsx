import { useEffect, useState } from "react";
import { setBusinessShare, teamOverview, type Session, type TeamRow } from "../lib/cloud";
import { t } from "../lib/i18n";
import { haptic } from "../lib/haptics";

/**
 * Ekip: yetkilinin her üyeye hangi işletmeleri paylaştığını seçtiği bölüm.
 * Yalnızca sahip olunan işletmeler listelenir; işaret koymak paylaşır, kaldırmak erişimi kapatır.
 */
export default function TeamSection({ session }: { session: Session }) {
  const [rows, setRows] = useState<TeamRow[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    try {
      const res = await teamOverview(session);
      if (res === "expired") setFailed(true);
      else setRows(res);
    } catch {
      setFailed(true);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (failed) return <p className="field-hint">{t("Ekip bilgileri yüklenemedi.")}</p>;
  if (!rows) return <p className="card-empty">{t("Yükleniyor…")}</p>;

  // Yetkilinin işletmeleri: sahip satırı olanlar
  const owned = rows.filter((r) => r.role === "owner");
  const businesses = Array.from(new Map(owned.map((r) => [r.business_id, r.business_name])).entries());
  // Üyeler: sahip olmayan kişiler (e-postaya göre tekil)
  const members = Array.from(
    new Map(rows.filter((r) => r.role === "member").map((r) => [r.user_id, r.email])).entries(),
  );

  if (members.length === 0) return <p className="card-empty">{t("Henüz ekip üyesi yok.")}</p>;

  const shared = (businessId: string, userId: string) =>
    rows.some((r) => r.business_id === businessId && r.user_id === userId && r.role === "member");

  return (
    <div className="team-list">
      {members.map(([userId, email]) => (
        <div key={userId} className="team-member">
          <strong className="team-email">{email}</strong>
          {businesses.map(([businessId, name]) => {
            const on = shared(businessId, userId);
            return (
              <label key={businessId} className="setting-row">
                <span className="setting-text">
                  <strong>{name}</strong>
                </span>
                <input
                  type="checkbox"
                  checked={on}
                  disabled={busy === `${businessId}:${userId}`}
                  onChange={async (e) => {
                    haptic("light");
                    setBusy(`${businessId}:${userId}`);
                    try {
                      await setBusinessShare(session, businessId, userId, e.target.checked);
                      await load();
                    } catch {
                      setFailed(true);
                    } finally {
                      setBusy(null);
                    }
                  }}
                />
              </label>
            );
          })}
        </div>
      ))}
    </div>
  );
}
