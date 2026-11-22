import { regionCurrency } from "../lib/currencies";
import { deviceRegion } from "../lib/region";
import { getLanguage, t } from "../lib/i18n";
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
  /** Arşivdeki kayıt ana listede görünmez; verileri ve analizleri silinmez */
  archived?: boolean;
  /** Misafire gösterilen örnek kayıt; hesap açılınca silinir, buluta gönderilmez */
  sample?: boolean;
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

/**
 * Kasaya dokunmayan ek işlemler: devir (açılış bakiyesi), iade ve indirim. Her sekmede iki yönlüdür.
 * Bakiye yönü mevcut SATIŞ (+) / ALIŞ (−) türüyle saklanır; işlemin kendisi `sub` alanındadır.
 * Böylece bu alanı tanımayan eski sürümler kaydı satış/alış gibi gösterir ama bakiyeyi doğru hesaplar.
 */
export const EXTRA_TYPES = ["DEVİR", "İADE", "İNDİRİM"] as const;
export type ExtraType = (typeof EXTRA_TYPES)[number];
/** Ekrandaki işlem sekmeleri: dört temel işlem, sonra sağa kaydırınca ek işlemler */
export type EntryKind = TxType | ExtraType;
export const ENTRY_KINDS: EntryKind[] = [...TX_TYPES, ...EXTRA_TYPES];
export function isExtra(kind: EntryKind): kind is ExtraType {
  return (EXTRA_TYPES as readonly string[]).includes(kind);
}

/** Ek işlemin iki yönü: ekrandaki metin ve saklanan bakiye yönü (SATIŞ: bakiye artar, ALIŞ: azalır) */
export const EXTRA_DIRECTIONS: Record<ExtraType, { label: string; base: "SATIŞ" | "ALIŞ" }[]> = {
  DEVİR: [
    { label: "Bana borçlu", base: "SATIŞ" },
    { label: "Ben borçluyum", base: "ALIŞ" },
  ],
  İADE: [
    { label: "Sattığım mal geri geldi", base: "ALIŞ" },
    { label: "Aldığım malı geri verdim", base: "SATIŞ" },
  ],
  İNDİRİM: [
    { label: "Ben indirim yaptım", base: "ALIŞ" },
    { label: "Bana indirim yapıldı", base: "SATIŞ" },
  ],
};

/** Kaydın ekranda görünen türü: ek işlemse onun adı (DEVİR…), değilse temel tür */
export function kindOf(tx: Pick<Transaction, "type" | "sub">): EntryKind {
  return tx.sub && isExtra(tx.sub) ? tx.sub : tx.type;
}

/** Ek işlemin yön metni (ör. "Bana borçlu"); temel işlemde boş */
export function directionLabel(tx: Pick<Transaction, "type" | "sub">): string {
  if (!tx.sub || !isExtra(tx.sub)) return "";
  return EXTRA_DIRECTIONS[tx.sub].find((d) => d.base === tx.type)?.label ?? "";
}

export interface Transaction {
  id: string;
  customerId: string;
  /** Bakiye yönü. Ek işlemlerde yalnızca SATIŞ (+) ya da ALIŞ (−) olur */
  type: TxType;
  /** Ek işlem: devir, iade ya da indirim (kasaya dokunmaz) */
  sub?: ExtraType;
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
    if (t.sub) {
      // Devir eski bakiyedir, bu dönemin geliri ya da gideri değildir. İade ve indirim satıştan
      // (bakiyeyi azaltıyorsa) ya da alıştan (bakiyeyi artırıyorsa) düşülür.
      if (t.sub === "DEVİR") continue;
      if (t.type === "ALIŞ") totals.satis -= t.amount;
      else totals.alis -= t.amount;
      continue;
    }
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
  /** Yazı boyutu: küçük, orta, büyük */
  textSize: "small" | "medium" | "large";
  /** Müşteri ve tedarikçi listesinin sıralaması: A'dan Z'ye, bakiyeye göre artan ya da azalan */
  listSort: "name" | "balance-asc" | "balance-desc";
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
  // İlk açılışta telefonun bölgesine göre (Türkiye'de ₺, Almanya'da €…); sonra ayarlardan değişir
  currency: regionCurrency(deviceRegion()),
  // Yeni cihazlarda eski "orta" boyut (16 px) varsayılandır
  textSize: "small",
  listSort: "name",
  haptics: true,
  notifyReceivable: true,
  receivableLimit: 100000,
  notifyPayable: true,
  payableLimit: 25000,
  notifyLowCash: true,
  lowCashLimit: 50000,
  supportEmail: "",
};

/**
 * Misafir (kayıtsız) kullanıcıya ana sayfa dolu görünsün diye örnek şirketler ve işlemler. Firma adları uygulamanın
 * diline göre seçilir ve uydurmadır; hiçbiri gerçek bir kişinin ya da şirketin verisi değildir. İşlem açıklamaları
 * çeviriden gelir. Hepsi "sample" işaretlidir ve hesap açılınca silinir (buluta gönderilmez).
 * Ücretsiz paketin 10 kayıt sınırının altında kalır ki kişi kendi müşterisini ekleyebilsin.
 */
const SAMPLE_NAMES: Record<string, string[]> = {
  tr: ["Yıldız Gıda Ltd. Şti.", "Akdeniz Yapı İnşaat", "Kardeşler Mobilya", "Doğa Tekstil San. Tic.", "Güven Market", "Anadolu Toptan Gıda", "Hızlı Nakliyat", "Ege Ambalaj San."],
  en: ["Brookfield Foods Ltd.", "Harborline Construction", "Oakridge Furniture", "Riverbend Textiles", "Corner Street Market", "Summit Wholesale Supply", "Swiftway Freight", "Coastal Pack Co."],
  de: ["Bergmann Lebensmittel GmbH", "Rheinbau Bauunternehmen", "Holzwerk Möbel", "Weber Textil", "Marktladen Schulz", "Nordhandel Großhandel", "Schnell Spedition", "Elbe Verpackung"],
  fr: ["Épicerie Durand SARL", "Bâtiments Lemoine", "Meubles Girard", "Textiles Moreau", "Supérette du Coin", "Grossiste Bernard", "Transports Rapido", "Emballages Loire"],
  es: ["Alimentos Herrera S.L.", "Construcciones Ruiz", "Muebles Ortega", "Textiles Navarro", "Supermercado El Rincón", "Mayorista del Sur", "Transportes Veloz", "Envases Levante"],
  it: ["Alimentari Rossi S.r.l.", "Edilizia Bianchi", "Mobili Ferrari", "Tessuti Galli", "Market Da Gino", "Ingrosso Conti", "Trasporti Veloci", "Imballaggi Adriatico"],
  pt: ["Alimentos Souza Ltda.", "Construtora Almeida", "Móveis Carvalho", "Tecidos Ribeiro", "Mercadinho da Esquina", "Atacado Central", "Transportes Ligeiro", "Embalagens Sul"],
  ru: ["ООО «Волга Продукт»", "СтройГрад", "Мебель Кедр", "Текстиль Ока", "Магазин «Уголок»", "Оптовая база Урал", "Быстрая Доставка", "Упаковка Дон"],
  uk: ["ТОВ «Дніпро Продукт»", "БудМайстер", "Меблі Дуб", "Текстиль Десна", "Магазин «Куточок»", "Оптова база Карпати", "Швидка Доставка", "Пакування Буг"],
  pl: ["Spożywka Nowak Sp. z o.o.", "Budex Kowalski", "Meble Dąb", "Tekstylia Wiśniewski", "Sklep Na Rogu", "Hurtownia Mazur", "Szybki Transport", "Opakowania Bałtyk"],
  nl: ["Van Dijk Voeding B.V.", "Bouwbedrijf De Boer", "Meubelhuis Eik", "Textiel Jansen", "Buurtwinkel De Hoek", "Groothandel Noord", "Snel Transport", "Verpakking Maas"],
  ar: ["شركة النخيل للأغذية", "مؤسسة البناء الحديث", "أثاث الأرز", "نسيج الواحة", "بقالة الحي", "مستودع الجملة الشرقي", "النقل السريع", "تغليف الخليج"],
  id: ["PT Sumber Pangan", "CV Bangun Jaya", "Mebel Jati Indah", "Tekstil Nusantara", "Toko Sejahtera", "Grosir Makmur", "Ekspedisi Cepat", "Kemasan Mandiri"],
  hi: ["शर्मा फूड्स प्रा. लि.", "गणेश कंस्ट्रक्शन", "वर्मा फर्नीचर", "गंगा टेक्सटाइल्स", "मोहल्ला किराना स्टोर", "मिलन होलसेल", "तेज़ ट्रांसपोर्ट", "सागर पैकेजिंग"],
  ja: ["山田食品株式会社", "さくら建設", "木村家具店", "青葉テキスタイル", "まちかどマート", "東和卸売", "はやて運輸", "みなと包装"],
  ko: ["한빛식품(주)", "새솔건설", "나무결가구", "푸른섬유", "골목마트", "한결도매", "빠른물류", "바다포장"],
  zh: ["华丰食品有限公司", "建安建筑", "林木家具", "锦绣纺织", "街角超市", "通达批发", "快捷物流", "海联包装"],
};

export function guestSamples(): { parties: Customer[]; transactions: Transaction[] } {
  const n8 = SAMPLE_NAMES[getLanguage()] ?? SAMPLE_NAMES.en;
  const ids = ["ornek-m1", "ornek-m2", "ornek-m3", "ornek-m4", "ornek-m5", "ornek-t1", "ornek-t2", "ornek-t3"];
  const parties: Customer[] = ids.map((id, i) => ({ id, name: n8[i], kind: i < 5 ? "customer" : "supplier", sample: true }));
  const tx: Transaction[] = [];
  let n = 0;
  const add = (customerId: string, type: TxType, days: number, amount: number, description: string, account?: AccountId) =>
    tx.push({ id: `ornek-tx-${++n}`, customerId, type, date: ago(days, 10 + (n % 7), (n * 13) % 60), description, amount, account });
  // Son altı ay: her ay satış ve alış, ardından kısmi tahsilat ve ödeme (grafikler dolu görünür)
  const months = [150, 120, 90, 60, 30, 3];
  months.forEach((d, i) => {
    add("ornek-m1", "SATIŞ", d, 18000 + i * 2500, t("Ürün satışı"));
    add("ornek-m2", "SATIŞ", d - 1, 9500 + i * 1200, t("Malzeme satışı"));
    add("ornek-m3", "SATIŞ", d - 2, 14000 + (i % 3) * 3000, t("Mobilya satışı"));
    add("ornek-t1", "ALIŞ", d, 11000 + i * 900, t("Mal alışı"));
    add("ornek-t2", "ALIŞ", d - 1, 3200 + (i % 2) * 800, t("Nakliye"));
    if (d > 3) {
      add("ornek-m1", "TAHSİLAT", d - 8, 15000 + i * 2000, t("Ödeme"), "bank");
      add("ornek-m2", "TAHSİLAT", d - 9, 8000 + i * 1000, t("Ödeme"), "cash");
      add("ornek-t1", "ÖDEME", d - 10, 9000 + i * 800, t("Ödeme"), "bank");
      add("ornek-t2", "ÖDEME", d - 7, 3000, t("Ödeme"), "cash");
    }
  });
  add("ornek-m4", "SATIŞ", 45, 26000, t("Kumaş satışı"));
  add("ornek-m4", "TAHSİLAT", 20, 12000, t("Kısmi ödeme"), "cash");
  add("ornek-m5", "SATIŞ", 12, 7400, t("Ürün satışı"));
  add("ornek-t3", "ALIŞ", 25, 4800, t("Ambalaj alışı"));
  return { parties, transactions: tx };
}
