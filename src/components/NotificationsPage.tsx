import { t } from "../lib/i18n";
import { haptic } from "../lib/haptics";
import { MENU_ITEMS } from "../lib/menu";
import type { AppNotification } from "../lib/notifications";
import PageHeader from "./PageHeader";
import { Svg } from "./Icon";

const ICON = MENU_ITEMS[5].icon;

const KIND_ICON: Record<AppNotification["kind"], string> = {
  receivable: "M12 3v14M6 11l6 6 6-6M5 21h14",
  payable: "M12 21V7M6 13l6-6 6 6M5 3h14",
  cash: "M3 7h18v10H3zM12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z",
  activity: "M4 12h4l3-8 4 16 3-8h2",
};

/**
 * Bildirimler: verilerinizden üretilir (düşük kasa, yüksek alacak/borç, bugünkü işlemler).
 * Okunmamışlar vurgulanır; dokununca okundu olur ve ilgili kişi varsa hesabı açılır.
 */
export default function NotificationsPage({
  notifications,
  readIds,
  onRead,
  onReadAll,
  onOpenParty,
  onOpenSettings,
  onBack,
}: {
  notifications: AppNotification[];
  readIds: string[];
  onRead: (id: string) => void;
  onReadAll: () => void;
  onOpenParty: (id: string) => void;
  onOpenSettings: () => void;
  onBack: () => void;
}) {
  const unread = notifications.filter((n) => !readIds.includes(n.id)).length;

  return (
    <div className="cust-page">
      <PageHeader
        title={t("Bildirimler")}
        subtitle={unread > 0 ? t("{n} okunmamış", { n: unread }) : t("Hepsi okundu")}
        icon={ICON}
        onBack={onBack}
        action={
          <button
            className="header-add"
            type="button"
            disabled={unread === 0}
            onClick={() => {
              haptic("light");
              onReadAll();
            }}
          >
            {t("HEPSİNİ OKU")}
          </button>
        }
      />

      {notifications.length === 0 ? (
        <div className="search-empty">
          <p>{t("Şu an bildirim yok.")}</p>
          <button type="button" className="help-link" onClick={onOpenSettings}>
            {t("Bildirim limitlerini düzenle")}
          </button>
        </div>
      ) : (
        <ul className="list">
          {notifications.map((n) => {
            const isUnread = !readIds.includes(n.id);
            return (
              <li key={n.id}>
                <button
                  type="button"
                  className={`notif-row ${isUnread ? "is-unread" : ""}`}
                  onClick={() => {
                    haptic("light");
                    onRead(n.id);
                    if (n.partyId) onOpenParty(n.partyId);
                  }}
                >
                  <span className={`notif-icon kind-${n.kind}`} aria-hidden="true">
                    <Svg d={KIND_ICON[n.kind]} />
                  </span>
                  <span className="notif-body">
                    <strong>{n.title}</strong>
                    <span>{n.body}</span>
                  </span>
                  {isUnread && <span className="notif-dot" aria-label={t("Okunmamış")} />}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <button type="button" className="help-link notif-settings" onClick={onOpenSettings}>
        {t("Bildirim limitlerini düzenle")}
      </button>
    </div>
  );
}
