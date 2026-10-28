import { useEffect, useState } from "react";
import {
  decideJoin,
  teamPeople,
  listChangeNotices,
  listPendingRequests,
  loadSession,
  markChangeNoticesRead,
  type ChangeNotice,
  type PendingRequest,
} from "../lib/cloud";
import { locale, t } from "../lib/i18n";
import { canAddTeamMember } from "../lib/plan";
import { haptic } from "../lib/haptics";
import { SUPPORT_ICON } from "../lib/menu";
import PageHeader from "./PageHeader";

/** Bildirimler: yetkili olduğu işletmelere gelen katılma isteklerini onaylar ya da reddeder */
export default function BusinessRequestsPage({ onBack }: { onBack: () => void }) {
  const session = loadSession();
  const [items, setItems] = useState<PendingRequest[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [changes, setChanges] = useState<ChangeNotice[]>([]);

  async function refresh() {
    if (!session) {
      setItems([]);
      return;
    }
    try {
      const res = await listPendingRequests(session);
      if (res === "expired") {
        setFailed(true);
        return;
      }
      setItems(res);
      const notices = await listChangeNotices(session);
      if (Array.isArray(notices)) setChanges(notices);
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }

  useEffect(() => {
    void refresh();
    // Sayfa açıkken yeni istekler yarım dakikada bir kontrol edilir
    const timer = window.setInterval(() => void refresh(), 30_000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function decide(item: PendingRequest, approve: boolean) {
    if (!session) return;
    setBusyId(item.request_id);
    try {
      // Ekip sınırı: onaylamadan önce mevcut üye sayısına bakılır
      if (approve) {
        const people = await teamPeople(session);
        if (Array.isArray(people) && !canAddTeamMember(people.length)) {
          setNotice(t("Ekip sınırına ulaşıldı. Daha fazla üye için paketi yükseltin."));
          return;
        }
      }
      const res = await decideJoin(session, item.request_id, approve);
      if (res === "limit") {
        setNotice(t("Ekip sınırına ulaşıldı. Daha fazla üye için paketi yükseltin."));
        return;
      }
      if (res === true) {
        haptic(approve ? "success" : "light");
        setItems((list) => (list ? list.filter((x) => x.request_id !== item.request_id) : list));
      }
    } catch {
      setFailed(true);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="cust-page">
      <PageHeader title={t("Bildirimler")} subtitle={t("Katılma istekleri")} icon={SUPPORT_ICON} onBack={onBack} />
      <div className="stack">
        <section className="card" aria-label={t("Değişiklik bildirimleri")}>
          <h2 className="card-title">{t("DEĞİŞİKLİKLER")}</h2>
          {changes.length === 0 && <p className="card-empty">{t("Yeni değişiklik yok.")}</p>}
          {changes.map((c) => (
            <div key={c.id} className="request-row">
              <div className="request-text">
                <small>{c.message}</small>
                <small>{new Date(c.created_at).toLocaleString(locale(), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</small>
              </div>
            </div>
          ))}
          {changes.length > 0 && (
            <button
              type="button"
              className="help-link"
              onClick={async () => {
                if (!session) return;
                const r = await markChangeNoticesRead(session);
                if (r === true) setChanges([]);
              }}
            >
              {t("Hepsini okundu işaretle")}
            </button>
          )}
        </section>

        <section className="card" aria-label={t("Katılma istekleri")}>
          {failed && <p className="form-error" role="alert">{t("Bildirimler yüklenemedi.")}</p>}
          {notice && <p className="form-error" role="alert">{notice}</p>}
          {!failed && items === null && <p className="card-empty">{t("Yükleniyor…")}</p>}
          {items && items.length === 0 && <p className="card-empty">{t("Bekleyen bildirim yok.")}</p>}
          {items &&
            items.map((item) => (
              <div key={item.request_id} className="request-row">
                <div className="request-text">
                  <strong>{item.requester_email}</strong>
                  <small>{t("{name} işletmenize katılmak istiyor", { name: item.business_name })}</small>
                </div>
                <div className="request-actions">
                  <button type="button" className="request-approve" disabled={busyId === item.request_id} onClick={() => decide(item, true)}>
                    {t("Onayla")}
                  </button>
                  <button type="button" className="request-reject" disabled={busyId === item.request_id} onClick={() => decide(item, false)}>
                    {t("Reddet")}
                  </button>
                </div>
              </div>
            ))}
        </section>
      </div>
    </div>
  );
}
