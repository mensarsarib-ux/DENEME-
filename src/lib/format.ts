import { DEFAULT_CURRENCY, currencyOf } from "./currencies";

/** Etkin para birimi; ayarlardan seçilince App tarafından güncellenir (tutarlar çevrilmez, yalnızca biçim değişir) */
let currency = DEFAULT_CURRENCY;
let fullFormat = make(2, 2);
let roundFormat = make(0, 0);

function make(min: number, max: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency,
    minimumFractionDigits: min,
    maximumFractionDigits: max,
  });
}

export function setCurrency(code: string) {
  if (code === currency) return;
  currency = currencyOf(code).code;
  fullFormat = make(2, 2);
  roundFormat = make(0, 0);
}

/** Etkin para biriminin sembolü (form etiketlerinde kullanılır) */
export const currencySymbol = () => currencyOf(currency).symbol;

export const money = { format: (value: number) => fullFormat.format(value) };

/** Grafik sütunları gibi dar alanlar için kuruşsuz biçim */
export const moneyRound = { format: (value: number) => roundFormat.format(value) };

/** Örn. "30 EYLÜL, 14:32" */
export function formatDateTime(iso: string): string {
  return new Date(iso)
    .toLocaleString("tr-TR", {
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    })
    .toLocaleUpperCase("tr-TR");
}
