// Geçici örnek veriler. Gerçek veri katmanı eklendiğinde bu dosya değiştirilecek.

export type Period = "daily" | "weekly" | "monthly" | "yearly";

export interface Account {
  id: string;
  name: string;
  balance: number;
}

export const accounts: Account[] = [
  { id: "cash", name: "Kasa", balance: 117866 },
];

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  email?: string;
  note?: string;
}

export const initialCustomers: Customer[] = [
  { id: "1", name: "Ahmet Yılmaz Ticaret" },
  { id: "2", name: "Ayşe Demir Mobilya" },
  { id: "3", name: "Mehmet Kaya İnşaat" },
  { id: "4", name: "Zeynep Çelik Gıda" },
  { id: "5", name: "Ali Vural Lojistik" },
  { id: "6", name: "Elif Arslan Tekstil" },
  { id: "7", name: "Burak Öztürk Market" },
  { id: "8", name: "Derya Aydın Kırtasiye" },
];

export const TX_TYPES = ["SATIŞ", "ALIŞ", "TAHSİLAT"] as const;
export type TxType = (typeof TX_TYPES)[number];

export interface Transaction {
  id: string;
  customerId: string;
  type: TxType;
  /** ISO tarih-saat (UTC) */
  date: string;
  description: string;
  amount: number;
}

/** Bugünden `days` gün önce, verilen saatte ISO tarih üretir */
function ago(days: number, hour: number, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

// Örnek işlemler bugüne göre üretilir; böylece her dönemde veri görünür.
export const initialTransactions: Transaction[] = [
  { id: "t1", customerId: "1", type: "SATIŞ", date: ago(0, 9, 30), description: "Kumaş satışı", amount: 9175 },
  { id: "t2", customerId: "2", type: "ALIŞ", date: ago(0, 10, 15), description: "Aksesuar alımı", amount: 2990 },
  { id: "t3", customerId: "3", type: "SATIŞ", date: ago(0, 11, 0), description: "Takım satışı, 30 ve 20 cm", amount: 4880 },
  { id: "t4", customerId: "1", type: "TAHSİLAT", date: ago(0, 12, 0), description: "Kısmi ödeme", amount: 3000 },
  { id: "t5", customerId: "4", type: "ALIŞ", date: ago(2, 11, 5), description: "Hammadde alımı", amount: 25000 },
  { id: "t6", customerId: "5", type: "SATIŞ", date: ago(3, 16, 20), description: "Toplu sipariş", amount: 40200 },
  { id: "t7", customerId: "6", type: "ALIŞ", date: ago(4, 13, 10), description: "Malzeme alımı", amount: 3360 },
  { id: "t8", customerId: "7", type: "SATIŞ", date: ago(5, 8, 50), description: "Ürün satışı", amount: 13310 },
  { id: "t9", customerId: "5", type: "TAHSİLAT", date: ago(6, 14, 0), description: "Sipariş ödemesi", amount: 20000 },
  { id: "t10", customerId: "8", type: "SATIŞ", date: ago(12, 15, 45), description: "Kırtasiye siparişi", amount: 62760 },
  { id: "t11", customerId: "7", type: "TAHSİLAT", date: ago(15, 10, 0), description: "Ödeme", amount: 8000 },
  { id: "t12", customerId: "3", type: "ALIŞ", date: ago(25, 9, 0), description: "Hammadde alımı", amount: 12000 },
  { id: "t13", customerId: "2", type: "SATIŞ", date: ago(60, 14, 30), description: "Montaj hizmeti", amount: 18000 },
  { id: "t14", customerId: "4", type: "SATIŞ", date: ago(90, 13, 0), description: "Ürün satışı", amount: 54000 },
  { id: "t15", customerId: "6", type: "TAHSİLAT", date: ago(120, 11, 0), description: "Çek tahsilatı", amount: 5000 },
];

/** Alacak yönü: satış bakiyeyi artırır; alış ve tahsilat azaltır. */
const SIGN: Record<TxType, number> = {
  SATIŞ: 1,
  ALIŞ: -1,
  TAHSİLAT: -1,
};

export function signOf(type: TxType): number {
  return SIGN[type];
}

/** Müşterinin işlemleri tarih sırasıyla: en eski üstte, en yeni altta */
export function transactionsOf(
  list: Transaction[],
  customerId: string,
): Transaction[] {
  return list
    .filter((t) => t.customerId === customerId)
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Pozitif: alacak, negatif: borç */
export function balanceOf(list: Transaction[], customerId: string): number {
  return transactionsOf(list, customerId).reduce(
    (sum, t) => sum + SIGN[t.type] * t.amount,
    0,
  );
}

/** Dönemin başlangıcı (dahil) ve bitişi (hariç). Hafta pazartesi başlar. */
export function periodRange(period: Period, now = new Date()): [Date, Date] {
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();
  switch (period) {
    case "daily":
      return [new Date(y, m, d), new Date(y, m, d + 1)];
    case "weekly": {
      const offset = (now.getDay() + 6) % 7;
      return [new Date(y, m, d - offset), new Date(y, m, d - offset + 7)];
    }
    case "monthly":
      return [new Date(y, m, 1), new Date(y, m + 1, 1)];
    case "yearly":
      return [new Date(y, 0, 1), new Date(y + 1, 0, 1)];
  }
}

export interface Totals {
  alis: number;
  satis: number;
  tahsilat: number;
}

/** Seçilen dönemdeki alış, satış ve tahsilat toplamları */
export function totalsFor(list: Transaction[], period: Period): Totals {
  const [start, end] = periodRange(period);
  const totals: Totals = { alis: 0, satis: 0, tahsilat: 0 };
  for (const t of list) {
    const at = new Date(t.date);
    if (at < start || at >= end) continue;
    if (t.type === "SATIŞ") totals.satis += t.amount;
    else if (t.type === "ALIŞ") totals.alis += t.amount;
    else totals.tahsilat += t.amount;
  }
  return totals;
}
