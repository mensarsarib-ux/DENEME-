import type { Account, Customer, Settings, Transaction } from "../data/mock";
import { t } from "./i18n";

export interface AppNotification {
  /** Aynı uyarı için hep aynı kimlik; okundu bilgisi buna göre saklanır */
  id: string;
  kind: "activity";
  title: string;
  body: string;
  /** İlgili kişi varsa dokununca onun hesabı açılır */
  partyId?: string;
}

const dayKey = (d: Date) =>
  `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

/** Bildirimler verilerden üretilir: şimdilik yalnızca bugün girilen işlemlerin özeti. */
export function buildNotifications(
  _parties: Customer[],
  transactions: Transaction[],
  _accounts: Account[],
  _settings: Settings,
  now = new Date(),
): AppNotification[] {
  const out: AppNotification[] = [];

  const today = dayKey(now);
  const todayCount = transactions.filter(
    (t) => dayKey(new Date(t.date)) === today,
  ).length;
  if (todayCount > 0) {
    out.push({
      id: `activity:${today}`,
      kind: "activity",
      title: t("Bugünkü işlemler"),
      body: t("Bugün {n} işlem girildi.", { n: todayCount }),
    });
  }

  return out;
}
