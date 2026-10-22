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
  /** Pozitif: alacak, negatif: borç */
  balance: number;
}

export const customers: Customer[] = [
  { id: "1", name: "Ahmet Yılmaz Ticaret", balance: 9175 },
  { id: "2", name: "Ayşe Demir Mobilya", balance: -2990 },
  { id: "3", name: "Mehmet Kaya İnşaat", balance: 4880 },
  { id: "4", name: "Zeynep Çelik Gıda", balance: -25000 },
  { id: "5", name: "Ali Vural Lojistik", balance: 402000 },
  { id: "6", name: "Elif Arslan Tekstil", balance: -3360 },
  { id: "7", name: "Burak Öztürk Market", balance: 133100 },
  { id: "8", name: "Derya Aydın Kırtasiye", balance: 62760 },
];
