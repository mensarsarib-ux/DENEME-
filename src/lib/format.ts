import { DEFAULT_CURRENCY, currencyOf } from "./currencies";
import { getLanguage, locale } from "./i18n";

/** Etkin para birimi; ayarlardan seçilince App tarafından güncellenir (tutarlar çevrilmez, yalnızca biçim değişir) */
let currency = DEFAULT_CURRENCY;
let fullFormat = make(2, 2);
let roundFormat = make(0, 0);

function make(min: number, max: number) {
  return new Intl.NumberFormat(locale(), {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: min,
    maximumFractionDigits: max,
  });
}

/**
 * Türkçede para sembolü sayının sağında yazılır: "60.187,00 ₺". Diğer dillerde yerel biçim kullanılır.
 * (Tarayıcıya göre sembol sola düşebildiği için sayı ve sembol burada birleştirilir.)
 */
function withSymbol(value: number, digits: [number, number], fallback: Intl.NumberFormat): string {
  if (getLanguage() !== "tr") return fallback.format(value);
  const num = new Intl.NumberFormat(locale(), {
    minimumFractionDigits: digits[0],
    maximumFractionDigits: digits[1],
  }).format(value);
  return `${num}\u00A0${currencyOf(currency).symbol}`;
}

let formatLocale = "";

export function setCurrency(code: string) {
  if (code === currency && formatLocale === locale()) return;
  formatLocale = locale();
  currency = currencyOf(code).code;
  fullFormat = make(2, 2);
  roundFormat = make(0, 0);
}

/** Etkin para biriminin sembolü (form etiketlerinde kullanılır) */
/** Etkin para biriminin ISO kodu (TRY, USD…) */
export const currencyCode = () => currency;

export const currencySymbol = () => currencyOf(currency).symbol;

export const money = { format: (value: number) => withSymbol(value, [2, 2], fullFormat) };

/** Grafik sütunları gibi dar alanlar için kuruşsuz biçim */
export const moneyRound = { format: (value: number) => withSymbol(value, [0, 0], roundFormat) };

/** Örn. "30 EYLÜL, 14:32" */
export function formatDateTime(iso: string): string {
  return new Date(iso)
    .toLocaleString(locale(), {
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    })
    .toLocaleUpperCase(locale());
}
