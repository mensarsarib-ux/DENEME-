// Geçici örnek veriler. Gerçek veri katmanı eklendiğinde bu dosya değiştirilecek.

export type Period = "monthly" | "weekly" | "yearly";

export const summaryByPeriod: Record<
  Period,
  { income: number; expense: number }
> = {
  weekly: { income: 42000, expense: 27500 },
  monthly: { income: 233750, expense: 121300 },
  yearly: { income: 2140000, expense: 1475000 },
};

export interface Account {
  id: string;
  name: string;
  balance: number;
}

export const accounts: Account[] = [
  { id: "cash", name: "Nakit (Kasa)", balance: 117866 },
  { id: "bank", name: "Banka hesabım", balance: 67153 },
];

export interface Customer {
  id: string;
  name: string;
}

export const customers: Customer[] = [
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
  /** ISO tarih-saat */
  date: string;
  description: string;
  amount: number;
}

export const transactions: Transaction[] = [
  { id: "t1", customerId: "1", type: "SATIŞ", date: "2026-09-28T10:15:00", description: "Kumaş satışı", amount: 9175 },
  { id: "t2", customerId: "2", type: "ALIŞ", date: "2026-09-27T09:40:00", description: "Aksesuar alımı", amount: 2990 },
  { id: "t3", customerId: "3", type: "SATIŞ", date: "2026-09-30T14:32:00", description: "Takım satışı, 30 ve 20 cm", amount: 4880 },
  { id: "t4", customerId: "4", type: "ALIŞ", date: "2026-09-25T11:05:00", description: "Hammadde alımı", amount: 25000 },
  { id: "t5", customerId: "5", type: "SATIŞ", date: "2026-09-29T16:20:00", description: "Toplu sipariş", amount: 402000 },
  { id: "t6", customerId: "6", type: "ALIŞ", date: "2026-09-24T13:10:00", description: "Malzeme alımı", amount: 3360 },
  { id: "t7", customerId: "7", type: "SATIŞ", date: "2026-09-26T08:50:00", description: "Ürün satışı", amount: 133100 },
  { id: "t8", customerId: "8", type: "SATIŞ", date: "2026-09-23T15:45:00", description: "Kırtasiye siparişi", amount: 62760 },
];

/** Alacak yönü: satış bakiyeyi artırır; alış ve tahsilat azaltır. */
const SIGN: Record<TxType, number> = {
  SATIŞ: 1,
  ALIŞ: -1,
  TAHSİLAT: -1,
};

export function transactionsOf(customerId: string): Transaction[] {
  return transactions
    .filter((t) => t.customerId === customerId)
    .sort((a, b) => b.date.localeCompare(a.date));
}

/** Pozitif: alacak, negatif: borç */
export function balanceOf(customerId: string): number {
  return transactionsOf(customerId).reduce(
    (sum, t) => sum + SIGN[t.type] * t.amount,
    0,
  );
}
