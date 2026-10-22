import { SAMPLE_LOGO } from "../lib/logo";
// Geçici örnek veriler. Gerçek veri katmanı eklendiğinde bu dosya değiştirilecek.

export type Period = "daily" | "weekly" | "monthly" | "yearly";

/** Kasanın iki hesabı: tahsilatlar ve ödemeler bunlardan birine işlenir */
export type AccountId = "cash" | "bank";

export interface Account {
  id: AccountId;
  name: string;
  /** Açılış bakiyesi */
  opening: number;
}

/** Varsayılan hesaplar; açılış bakiyeleri uygulamada düzenlenebilir */
export const initialAccounts: Account[] = [
  { id: "cash", name: "Nakit", opening: 80000 },
  { id: "bank", name: "Banka", opening: 60000 },
];

/** Cari grubunun kimliği: "customer", "supplier" veya kullanıcının açtığı sekmenin kimliği */
export type PartyKind = string;

/** Müşteriler, tedarikçiler gibi sekme. Kullanıcı kendi sekmelerini de ekleyebilir. */
export interface Group {
  id: PartyKind;
  name: string;
}

export const BUILTIN_GROUPS: Group[] = [
  { id: "customer", name: "Müşteriler" },
  { id: "supplier", name: "Tedarikçiler" },
];

/** Cari hesap: müşteri veya tedarikçi */
export interface Customer {
  id: string;
  name: string;
  kind: PartyKind;
  phone?: string;
  address?: string;
  email?: string;
  note?: string;
}

export const initialCustomers: Customer[] = [
  { id: "1", name: "Ahmet Yılmaz Ticaret", kind: "customer" },
  { id: "2", name: "Ayşe Demir Mobilya", kind: "customer" },
  { id: "3", name: "Mehmet Kaya İnşaat", kind: "customer" },
  { id: "4", name: "Zeynep Çelik Gıda", kind: "customer" },
  { id: "5", name: "Ali Vural Lojistik", kind: "customer" },
  { id: "6", name: "Elif Arslan Tekstil", kind: "customer" },
  { id: "7", name: "Burak Öztürk Market", kind: "customer" },
  { id: "8", name: "Derya Aydın Kırtasiye", kind: "customer" },
];

/** Her sekmede girilebilen dört işlem türü; ekrandaki sıra bu sıradır */
export const TX_TYPES = ["SATIŞ", "TAHSİLAT", "ALIŞ", "ÖDEME"] as const;
export type TxType = (typeof TX_TYPES)[number];

/** Sayfa açılırken seçili gelen işlem türü: müşteride SATIŞ, tedarikçi ve diğer sekmelerde ALIŞ */
export function defaultTxType(kind: PartyKind): TxType {
  return kind === "customer" ? "SATIŞ" : "ALIŞ";
}

export interface Transaction {
  id: string;
  customerId: string;
  type: TxType;
  /** ISO tarih-saat (UTC) */
  date: string;
  description: string;
  amount: number;
  /** Tahsilat ve ödemenin işlendiği hesap (nakit ya da banka); satış ve alışta boştur */
  account?: AccountId;
}

/** Bugünden `days` gün önce, verilen saatte ISO tarih üretir */
function ago(days: number, hour: number, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

// Örnek işlemler bugüne göre üretilir; böylece her dönemde veri görünür.
export const initialSuppliers: Customer[] = [
  { id: "s1", name: "Kaya Kumaş Toptan", kind: "supplier" },
  { id: "s2", name: "Demir Aksesuar San.", kind: "supplier" },
  { id: "s3", name: "Yıldız Ambalaj", kind: "supplier" },
  { id: "s4", name: "Öz Boya Kimya", kind: "supplier" },
];

export const initialTransactions: Transaction[] = [
  { id: "t1", customerId: "1", type: "SATIŞ", date: ago(0, 9, 30), description: "Kumaş satışı", amount: 9175 },
  { id: "t2", customerId: "s2", type: "ALIŞ", date: ago(0, 10, 15), description: "Aksesuar alımı", amount: 2990 },
  { id: "t3", customerId: "3", type: "SATIŞ", date: ago(0, 11, 0), description: "Takım satışı, 30 ve 20 cm", amount: 4880 },
  { id: "t4", customerId: "1", type: "TAHSİLAT", account: "cash", date: ago(0, 12, 0), description: "Kısmi ödeme", amount: 3000 },
  { id: "t5", customerId: "s1", type: "ALIŞ", date: ago(2, 11, 5), description: "Hammadde alımı", amount: 25000 },
  { id: "t6", customerId: "5", type: "SATIŞ", date: ago(3, 16, 20), description: "Toplu sipariş", amount: 40200 },
  { id: "t7", customerId: "s3", type: "ALIŞ", date: ago(4, 13, 10), description: "Malzeme alımı", amount: 3360 },
  { id: "t8", customerId: "7", type: "SATIŞ", date: ago(5, 8, 50), description: "Ürün satışı", amount: 13310 },
  { id: "t9", customerId: "5", type: "TAHSİLAT", account: "bank", date: ago(6, 14, 0), description: "Sipariş ödemesi", amount: 20000 },
  { id: "t10", customerId: "8", type: "SATIŞ", date: ago(12, 15, 45), description: "Kırtasiye siparişi", amount: 62760 },
  { id: "t11", customerId: "7", type: "TAHSİLAT", account: "cash", date: ago(15, 10, 0), description: "Ödeme", amount: 8000 },
  { id: "t12", customerId: "s1", type: "ALIŞ", date: ago(25, 9, 0), description: "Hammadde alımı", amount: 12000 },
  { id: "t13", customerId: "2", type: "SATIŞ", date: ago(60, 14, 30), description: "Montaj hizmeti", amount: 18000 },
  { id: "t14", customerId: "4", type: "SATIŞ", date: ago(90, 13, 0), description: "Ürün satışı", amount: 54000 },
  { id: "t15", customerId: "6", type: "TAHSİLAT", account: "bank", date: ago(120, 11, 0), description: "Çek tahsilatı", amount: 5000 },
  { id: "ts1", customerId: "s1", type: "ALIŞ", date: ago(1, 10, 20), description: "Kumaş alımı", amount: 18000 },
  { id: "ts2", customerId: "s1", type: "ÖDEME", account: "cash", date: ago(0, 9, 45), description: "Kısmi ödeme", amount: 6000 },
  { id: "ts3", customerId: "s2", type: "ALIŞ", date: ago(8, 14, 10), description: "Fermuar ve düğme", amount: 7400 },
  { id: "ts4", customerId: "s3", type: "ALIŞ", date: ago(20, 11, 30), description: "Ambalaj malzemesi", amount: 3200 },
  { id: "ts5", customerId: "s3", type: "ÖDEME", account: "bank", date: ago(10, 16, 0), description: "Ödeme", amount: 3200 },
  { id: "ts6", customerId: "s4", type: "ALIŞ", date: ago(35, 13, 15), description: "Boya alımı", amount: 9600 },
  { id: "t16", customerId: "1", type: "SATIŞ", date: ago(150, 11, 0), description: "Kumaş satışı", amount: 21000 },
  { id: "t17", customerId: "5", type: "SATIŞ", date: ago(185, 10, 0), description: "Toplu sipariş", amount: 38000 },
  { id: "t18", customerId: "7", type: "SATIŞ", date: ago(215, 15, 0), description: "Ürün satışı", amount: 17500 },
  { id: "t19", customerId: "3", type: "SATIŞ", date: ago(245, 9, 30), description: "Takım satışı", amount: 29000 },
  { id: "t20", customerId: "8", type: "SATIŞ", date: ago(280, 13, 0), description: "Kırtasiye siparişi", amount: 12400 },
  { id: "t21", customerId: "2", type: "SATIŞ", date: ago(315, 16, 0), description: "Montaj hizmeti", amount: 33000 },
  { id: "ts7", customerId: "s1", type: "ALIŞ", date: ago(155, 10, 0), description: "Kumaş alımı", amount: 14000 },
  { id: "ts8", customerId: "s2", type: "ALIŞ", date: ago(190, 12, 0), description: "Aksesuar alımı", amount: 8200 },
  { id: "ts9", customerId: "s4", type: "ALIŞ", date: ago(250, 14, 0), description: "Boya alımı", amount: 11000 },
  { id: "ts10", customerId: "s1", type: "ALIŞ", date: ago(320, 11, 0), description: "Kumaş alımı", amount: 16500 },
  { id: "t22", customerId: "5", type: "SATIŞ", date: ago(430, 10, 0), description: "Toplu sipariş", amount: 120000 },
  { id: "t23", customerId: "1", type: "SATIŞ", date: ago(800, 10, 0), description: "Kumaş satışı", amount: 98000 },
  { id: "t24", customerId: "7", type: "SATIŞ", date: ago(1200, 10, 0), description: "Ürün satışı", amount: 76000 },
  { id: "t25", customerId: "3", type: "SATIŞ", date: ago(1600, 10, 0), description: "Takım satışı", amount: 54000 },
  { id: "t26", customerId: "6", type: "SATIŞ", date: ago(140, 11, 0), description: "Kumaş satışı", amount: 15000 },
  { id: "ts11", customerId: "s1", type: "ALIŞ", date: ago(440, 11, 0), description: "Kumaş alımı", amount: 60000 },
  { id: "ts12", customerId: "s3", type: "ALIŞ", date: ago(810, 11, 0), description: "Ambalaj malzemesi", amount: 45000 },
  { id: "ts13", customerId: "s2", type: "ALIŞ", date: ago(1210, 11, 0), description: "Aksesuar alımı", amount: 30000 },
  { id: "ts14", customerId: "s4", type: "ALIŞ", date: ago(1620, 11, 0), description: "Boya alımı", amount: 21000 },
];

/** Alacak yönü: satış ve ödeme bakiyeyi artırır; alış ve tahsilat azaltır. */
const SIGN: Record<TxType, number> = {
  SATIŞ: 1,
  ALIŞ: -1,
  TAHSİLAT: -1,
  ÖDEME: 1,
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

/** Bugünün ayına göre `offset` ay önceki/sonraki ayın başlangıcı (dahil) ve bitişi (hariç). 0: bu ay. */
export function monthRange(offset: number, now = new Date()): [Date, Date] {
  const y = now.getFullYear();
  const m = now.getMonth() + offset;
  return [new Date(y, m, 1), new Date(y, m + 1, 1)];
}

/** Seçilen dönemdeki alış, satış ve tahsilat toplamları */
export function totalsFor(list: Transaction[], period: Period): Totals {
  return totalsBetween(list, periodRange(period));
}

/** Verilen tarih aralığındaki alış, satış ve tahsilat toplamları */
export function totalsBetween(
  list: Transaction[],
  [start, end]: [Date, Date],
): Totals {
  const totals: Totals = { alis: 0, satis: 0, tahsilat: 0 };
  for (const t of list) {
    const at = new Date(t.date);
    if (at < start || at >= end) continue;
    if (t.type === "SATIŞ") totals.satis += t.amount;
    else if (t.type === "ALIŞ") totals.alis += t.amount;
    else if (t.type === "TAHSİLAT") totals.tahsilat += t.amount;
  }
  return totals;
}

/** Kasaya dokunan işlemler: tahsilat para girişi, ödeme para çıkışıdır */
export function needsAccount(type: TxType): boolean {
  return type === "TAHSİLAT" || type === "ÖDEME";
}

/** Bir hesaba işlenen tahsilat ve ödemeler, eskiden yeniye */
export function movementsOf(list: Transaction[], accountId: AccountId): Transaction[] {
  return list
    .filter((t) => t.account === accountId && needsAccount(t.type))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Hesap bakiyesi: açılış + tahsilatlar − ödemeler */
export function accountBalance(
  list: Transaction[],
  accountList: Account[],
  accountId: AccountId,
): number {
  const opening = accountList.find((a) => a.id === accountId)?.opening ?? 0;
  return movementsOf(list, accountId).reduce(
    (sum, t) => sum + (t.type === "TAHSİLAT" ? t.amount : -t.amount),
    opening,
  );
}

/** Nakit ve bankanın toplamı: ana ekrandaki Kasa tutarı */
export function cashTotal(list: Transaction[], accountList: Account[]): number {
  return accountList.reduce(
    (sum, a) => sum + accountBalance(list, accountList, a.id),
    0,
  );
}

/** İşletme profili: üst çubukta ve menüde görünür */
export interface Profile {
  name: string;
  owner: string;
  phone: string;
  email: string;
  address: string;
  taxNo: string;
  /** Profil fotoğrafı / logo (küçültülmüş veri adresi); boşsa firma adının baş harfleri görünür */
  logo?: string;
}

export const DEFAULT_PROFILE: Profile = {
  name: "Örnek Ticaret A.Ş.",
  owner: "Mehmet Yıldız",
  phone: "",
  email: "",
  address: "",
  taxNo: "",
  logo: SAMPLE_LOGO,
};

export interface Note {
  id: string;
  title: string;
  text: string;
  pinned: boolean;
  /** ISO tarih-saat */
  updated: string;
}

export const initialNotes: Note[] = [
  {
    id: "n1",
    title: "Vergi beyannamesi",
    text: "KDV beyannamesini ayın 26'sından önce muhasebeciye ilet.",
    pinned: true,
    updated: ago(1, 9, 30),
  },
  {
    id: "n2",
    title: "Kumaş siparişi",
    text: "Kaya Kumaş'tan 30 top pamuklu kumaş için fiyat teklifi iste.",
    pinned: false,
    updated: ago(3, 15, 10),
  },
];

export interface Settings {
  haptics: boolean;
  /** ISO para birimi kodu (TRY, USD, EUR…) */
  currency: string;
  /** Arayüz dili: "tr" veya "en" */
  language: "tr" | "en";
  notifyReceivable: boolean;
  /** Bir kişinin alacağı bu tutarı geçince bildirim üretilir */
  receivableLimit: number;
  notifyPayable: boolean;
  /** Bir kişiye borcunuz bu tutarı geçince bildirim üretilir */
  payableLimit: number;
  notifyLowCash: boolean;
  /** Nakit ve banka toplamı bu tutarın altına inince bildirim üretilir */
  lowCashLimit: number;
  /** Destek mesajının gönderileceği e-posta adresi (boşsa yalnızca kopyalanır) */
  supportEmail: string;
}

export const DEFAULT_SETTINGS: Settings = {
  currency: "TRY",
  /** Arayüz dili */
  language: "tr",
  haptics: true,
  notifyReceivable: true,
  receivableLimit: 100000,
  notifyPayable: true,
  payableLimit: 25000,
  notifyLowCash: true,
  lowCashLimit: 50000,
  supportEmail: "",
};
