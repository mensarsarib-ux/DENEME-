/** Ayarlardan seçilebilen para birimleri; sembol rozet olarak, bayrak yanında gösterilir */
export interface Currency {
  code: string;
  name: string;
  symbol: string;
  flag: string;
}

export const CURRENCIES: Currency[] = [
  { code: "TRY", name: "Türk Lirası", symbol: "₺", flag: "🇹🇷" },
  { code: "USD", name: "ABD Doları", symbol: "$", flag: "🇺🇸" },
  { code: "EUR", name: "Euro", symbol: "€", flag: "🇪🇺" },
  { code: "GBP", name: "İngiliz Sterlini", symbol: "£", flag: "🇬🇧" },
  { code: "CHF", name: "İsviçre Frangı", symbol: "Fr", flag: "🇨🇭" },
  { code: "JPY", name: "Japon Yeni", symbol: "¥", flag: "🇯🇵" },
  { code: "CNY", name: "Çin Yuanı", symbol: "¥", flag: "🇨🇳" },
  { code: "CAD", name: "Kanada Doları", symbol: "C$", flag: "🇨🇦" },
  { code: "AUD", name: "Avustralya Doları", symbol: "A$", flag: "🇦🇺" },
  { code: "RUB", name: "Rus Rublesi", symbol: "₽", flag: "🇷🇺" },
  { code: "SAR", name: "Suudi Riyali", symbol: "﷼", flag: "🇸🇦" },
  { code: "AED", name: "BAE Dirhemi", symbol: "د.إ", flag: "🇦🇪" },
  { code: "QAR", name: "Katar Riyali", symbol: "ر.ق", flag: "🇶🇦" },
  { code: "KWD", name: "Kuveyt Dinarı", symbol: "د.ك", flag: "🇰🇼" },
  { code: "INR", name: "Hindistan Rupisi", symbol: "₹", flag: "🇮🇳" },
  { code: "KRW", name: "Güney Kore Wonu", symbol: "₩", flag: "🇰🇷" },
  { code: "BRL", name: "Brezilya Reali", symbol: "R$", flag: "🇧🇷" },
  { code: "MXN", name: "Meksika Pesosu", symbol: "Mex$", flag: "🇲🇽" },
  { code: "PLN", name: "Polonya Zlotisi", symbol: "zł", flag: "🇵🇱" },
  { code: "SEK", name: "İsveç Kronu", symbol: "kr", flag: "🇸🇪" },
  { code: "NOK", name: "Norveç Kronu", symbol: "kr", flag: "🇳🇴" },
  { code: "DKK", name: "Danimarka Kronu", symbol: "kr", flag: "🇩🇰" },
  { code: "AZN", name: "Azerbaycan Manatı", symbol: "₼", flag: "🇦🇿" },
  { code: "GEL", name: "Gürcistan Larisi", symbol: "₾", flag: "🇬🇪" },
  { code: "KZT", name: "Kazakistan Tengesi", symbol: "₸", flag: "🇰🇿" },
  { code: "EGP", name: "Mısır Lirası", symbol: "E£", flag: "🇪🇬" },
  { code: "ZAR", name: "Güney Afrika Randı", symbol: "R", flag: "🇿🇦" },
  { code: "IDR", name: "Endonezya Rupisi", symbol: "Rp", flag: "🇮🇩" },
  { code: "UAH", name: "Ukrayna Grivnası", symbol: "₴", flag: "🇺🇦" },
  { code: "CZK", name: "Çek Korunası", symbol: "Kč", flag: "🇨🇿" },
  { code: "HUF", name: "Macar Forinti", symbol: "Ft", flag: "🇭🇺" },
  { code: "RON", name: "Rumen Leyi", symbol: "lei", flag: "🇷🇴" },
  { code: "ILS", name: "İsrail Şekeli", symbol: "₪", flag: "🇮🇱" },
  { code: "SGD", name: "Singapur Doları", symbol: "S$", flag: "🇸🇬" },
  { code: "HKD", name: "Hong Kong Doları", symbol: "HK$", flag: "🇭🇰" },
  { code: "NZD", name: "Yeni Zelanda Doları", symbol: "NZ$", flag: "🇳🇿" },
  { code: "MYR", name: "Malezya Ringgiti", symbol: "RM", flag: "🇲🇾" },
  { code: "THB", name: "Tayland Bahtı", symbol: "฿", flag: "🇹🇭" },
  { code: "PHP", name: "Filipin Pesosu", symbol: "₱", flag: "🇵🇭" },
  { code: "VND", name: "Vietnam Dongu", symbol: "₫", flag: "🇻🇳" },
  { code: "PKR", name: "Pakistan Rupisi", symbol: "₨", flag: "🇵🇰" },
  { code: "NGN", name: "Nijerya Nairası", symbol: "₦", flag: "🇳🇬" },
];

/** Euro kullanan ülkeler */
const EURO = ["AT", "BE", "HR", "CY", "EE", "FI", "FR", "DE", "GR", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PT", "SK", "SI", "ES"];

/** Ülkeye göre para birimi (listede varsa) */
const REGION_CURRENCY: Record<string, string> = {
  TR: "TRY", US: "USD", GB: "GBP", CH: "CHF", JP: "JPY", CN: "CNY", CA: "CAD", AU: "AUD", RU: "RUB",
  SA: "SAR", AE: "AED", QA: "QAR", KW: "KWD", IN: "INR", KR: "KRW", BR: "BRL", MX: "MXN", PL: "PLN",
  SE: "SEK", NO: "NOK", DK: "DKK", AZ: "AZN", GE: "GEL", KZ: "KZT", EG: "EGP", ZA: "ZAR", ID: "IDR",
  UA: "UAH", CZ: "CZK", HU: "HUF", RO: "RON", IL: "ILS", SG: "SGD", HK: "HKD", NZ: "NZD", MY: "MYR",
  TH: "THB", PH: "PHP", VN: "VND", PK: "PKR", NG: "NGN",
  ...Object.fromEntries(EURO.map((r) => [r, "EUR"])),
};

/** Telefonun bölgesine göre başlangıç para birimi; bilinmiyorsa ABD Doları */
export function regionCurrency(region: string | null): string {
  return (region && REGION_CURRENCY[region]) || "USD";
}

export const DEFAULT_CURRENCY = "TRY";

export const currencyOf = (code: string): Currency =>
  CURRENCIES.find((c) => c.code === code) ?? CURRENCIES[0];
