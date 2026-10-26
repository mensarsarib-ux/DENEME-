import { useEffect, useState } from "react";
import { teamPeople, type Session, type TeamPerson } from "../lib/cloud";
import { t } from "../lib/i18n";
import { haptic } from "../lib/haptics";
import { SUPPORT_ICON } from "../lib/menu";
import { canUseTeam } from "../lib/plan";
import PageHeader from "./PageHeader";

/** Ekiplerim: ekip üyelerinin listesi; birine dokununca sınırları açılır */
export default function TeamPage({
  session,
  onOpen,
  onPlans,
  onBack,
}: {
  session: Session;
  onOpen: (person: TeamPerson) => void;
  /** Paketlere geç sayfası */
  onPlans: () => void;
  onBack: () => void;
}) {
  const [people, setPeople] = useState<TeamPerson[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    teamPeople(session)
      .then((r) => (r === "expired" ? setFailed(true) : setPeople(r)))
      .catch(() => setFailed(true));
  }, [session]);

  return (
    <div className="cust-page">
      <PageHeader title={t("Ekiplerim")} subtitle={t("Ekip üyeleri ve işletme erişimleri")} icon={SUPPORT_ICON} onBack={onBack} />
      <div className="stack">
        {!canUseTeam() && (
          <section className="card" aria-label={t("Paketlere geç")}>
            <p>{t("Ekip ve paylaşım için paketlere geçin.")}</p>
            <button type="button" className="primary-btn" onClick={onPlans}>{t("Paketlere geç")}</button>
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
