import { DEFAULT_CURRENCY, currencyOf } from "./currencies";
import { LANGUAGES, getLanguage, locale } from "./i18n";

/** Etkin para birimi; ayarlardan seçilince App tarafından güncellenir (tutarlar çevrilmez, yalnızca biçim değişir) */
let currency = DEFAULT_CURRENCY;

/**
 * Para sembolü görsel olarak hep sayının sağında durur: "60.187,00 ₺".
 * Soldan sağa dillerde sembol sayıdan sonra yazılır. Sağdan sola (Arapça) dilde sembol sayıdan önce yazılır,
 * çünkü o yönde önce yazılan öğe ekranın sağında kalır.
 * Sayı ve sembol burada birleştirilir; tarayıcıya göre sembolün yeri değişmez.
 */
/** Sayı biçimleyicileri dil ve basamak sayısına göre bir kez oluşturulur (uzun listelerde her satırda yeniden kurulmaz) */
const formatters = new Map<string, Intl.NumberFormat>();
function numberFormat(digits: [number, number]): Intl.NumberFormat {
  const key = `${locale()}|${digits[0]}|${digits[1]}`;
  let f = formatters.get(key);
  if (!f) {
    f = new Intl.NumberFormat(locale(), { minimumFractionDigits: digits[0], maximumFractionDigits: digits[1] });
    formatters.set(key, f);
  }
  return f;
}

function withSymbol(value: number, digits: [number, number]): string {
  const num = numberFormat(digits).format(value);
  const symbol = currencyOf(currency).symbol;
  const rtl = LANGUAGES.find((l) => l.code === getLanguage())?.rtl;
  return rtl ? `\u200F${symbol}\u00A0${num}` : `${num}\u00A0${symbol}`;
}

let formatLocale = "";

export function setCurrency(code: string) {
  if (code === currency && formatLocale === locale()) return;
  formatLocale = locale();
  currency = currencyOf(code).code;
}

/** Etkin para biriminin sembolü (form etiketlerinde kullanılır) */
/** Etkin para biriminin ISO kodu (TRY, USD…) */
export const currencyCode = () => currency;

export const currencySymbol = () => currencyOf(currency).symbol;

export const money = { format: (value: number) => withSymbol(value, [2, 2]) };

/** Grafik sütunları gibi dar alanlar için kuruşsuz biçim */
export const moneyRound = { format: (value: number) => withSymbol(value, [0, 0]) };

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
