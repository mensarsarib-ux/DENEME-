import {
  balanceOf,
  cashTotal,
  type Account,
  type Customer,
  type Settings,
  type Transaction,
} from "../data/mock";
import { money } from "./format";

export interface AppNotification {
  /** Aynı uyarı için hep aynı kimlik; okundu bilgisi buna göre saklanır */
  id: string;
  kind: "receivable" | "payable" | "cash" | "activity";
  title: string;
  body: string;
  /** İlgili kişi varsa dokununca onun hesabı açılır */
  partyId?: string;
}

const dayKey = (d: Date) =>
  `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

/**
 * Bildirimler verilerden üretilir: kasa düşükse, bugün işlem yapıldıysa,
 * bir kişinin alacağı ya da borcu belirlenen limiti aştıysa. Limitler Ayarlar'dadır.
 */
export function buildNotifications(
  parties: Customer[],
  transactions: Transaction[],
  accounts: Account[],
  settings: Settings,
  now = new Date(),
): AppNotification[] {
  const out: AppNotification[] = [];

  const total = cashTotal(transactions, accounts);
  if (settings.notifyLowCash && total < settings.lowCashLimit) {
    out.push({
      id: "cash:low",
      kind: "cash",
      title: "Kasa bakiyesi düşük",
      body: `Nakit ve banka toplamı ${money.format(total)}; belirlediğiniz ${money.format(settings.lowCashLimit)} limitinin altında.`,
    });
  }

  const today = dayKey(now);
  const todayCount = transactions.filter(
    (t) => dayKey(new Date(t.date)) === today,
  ).length;
  if (todayCount > 0) {
    out.push({
      id: `activity:${today}`,
      kind: "activity",
      title: "Bugünkü işlemler",
      body: `Bugün ${todayCount} işlem girildi.`,
    });
  }

  const balances = parties.map((p) => ({ p, balance: balanceOf(transactions, p.id) }));

  if (settings.notifyReceivable) {
    balances
      .filter((b) => b.balance >= settings.receivableLimit)
      .sort((a, b) => b.balance - a.balance)
      .forEach(({ p, balance }) =>
        out.push({
          id: `receivable:${p.id}`,
          kind: "receivable",
          title: `Yüksek alacak: ${p.name}`,
          body: `${money.format(balance)} tahsil edilmeyi bekliyor.`,
          partyId: p.id,
        }),
      );
  }

  if (settings.notifyPayable) {
    balances
      .filter((b) => -b.balance >= settings.payableLimit)
      .sort((a, b) => a.balance - b.balance)
      .forEach(({ p, balance }) =>
        out.push({
          id: `payable:${p.id}`,
          kind: "payable",
          title: `Yüksek borç: ${p.name}`,
          body: `${money.format(-balance)} ödemeniz bekleniyor.`,
          partyId: p.id,
        }),
      );
  }

  return out;
}
