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
];

export const DEFAULT_CURRENCY = "TRY";

export const currencyOf = (code: string): Currency =>
  CURRENCIES.find((c) => c.code === code) ?? CURRENCIES[0];
