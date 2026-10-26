import { useEffect, useState } from "react";
import { removeTeamMember, setBusinessShare, teamOverview, type Session, type TeamPerson, type TeamRow } from "../lib/cloud";
import { t } from "../lib/i18n";
import { haptic } from "../lib/haptics";
import { SUPPORT_ICON } from "../lib/menu";
import PageHeader from "./PageHeader";

/** Bir ekip üyesinin sınırları: hangi işletmeleri görüp görmeyeceği ve üyeyi silme */
export default function TeamMemberPage({
  session,
  person,
  onBack,
  onRemoved,
}: {
  session: Session;
  person: TeamPerson;
  onBack: () => void;
  onRemoved: () => void;
}) {
  const [rows, setRows] = useState<TeamRow[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

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
  }, [person.user_id]);

  const owned = rows ? Array.from(new Map(rows.filter((r) => r.role === "owner").map((r) => [r.business_id, r.business_name])).entries()) : [];
  const shared = (businessId: string) =>
    !!rows?.some((r) => r.business_id === businessId && r.user_id === person.user_id && r.role === "member");

  return (
    <div className="cust-page">
      <PageHeader title={person.email} subtitle={t("Hangi işletmeleri görsün?")} icon={SUPPORT_ICON} onBack={onBack} />
      <div className="stack">
        <section className="card" aria-label={t("İşletme erişimi")}>
          {failed && <p className="form-error" role="alert">{t("Bilgiler yüklenemedi.")}</p>}
          {!failed && rows === null && <p className="card-empty">{t("Yükleniyor…")}</p>}
          {rows && owned.length === 0 && <p className="card-empty">{t("Sahip olduğunuz işletme yok.")}</p>}
          {owned.map(([businessId, name]) => (
            <label key={businessId} className="setting-row">
              <span className="setting-text">
                <strong>{name}</strong>
                <small>{shared(businessId) ? t("Görebilir") : t("Göremez")}</small>
              </span>
              <input
                type="checkbox"
                checked={shared(businessId)}
                disabled={busy === businessId}
                onChange={async (e) => {
                  haptic("light");
                  setBusy(businessId);
                  try {
                    await setBusinessShare(session, businessId, person.user_id, e.target.checked);
                    await load();
                  } catch {
                    setFailed(true);
                  } finally {
                    setBusy(null);
                  }
                }}
              />
            </label>
          ))}
        </section>

        <section className="card" aria-label={t("Ekip üyesini sil")}>
          <button
            type="button"
            className="danger-btn"
            onClick={async () => {
              if (!window.confirm(t("Bu üye tüm işletmelerinizden çıkarılsın mı?"))) return;
              haptic("warning");
              try {
                const r = await removeTeamMember(session, person.user_id);
                if (r === true) onRemoved();
              } catch {
                setFailed(true);
              }
            }}
          >
            {t("Ekip üyesini sil")}
          </button>
        </section>
      </div>
    </div>
  );
}
