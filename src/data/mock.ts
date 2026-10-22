// Geçici örnek veriler. Gerçek veri katmanı eklendiğinde bu dosya değiştirilecek.

export type Period = "monthly" | "weekly" | "yearly";

export const summaryByPeriod: Record<
  Period,
  { income: number; expense: number }
> = {
  weekly: { income: 42000, expense: 27500 },
  monthly: { income: 185000, expense: 121300 },
  yearly: { income: 2140000, expense: 1475000 },
};

export interface Customer {
  id: string;
  name: string;
  /** Pozitif: alacak, negatif: borç */
  balance: number;
}

export const customers: Customer[] = [
  { id: "1", name: "Ahmet Yılmaz Ticaret", balance: 12500 },
  { id: "2", name: "Ayşe Demir Mobilya", balance: -4800 },
  { id: "3", name: "Mehmet Kaya İnşaat", balance: 36000 },
  { id: "4", name: "Zeynep Çelik Gıda", balance: -1250 },
];
