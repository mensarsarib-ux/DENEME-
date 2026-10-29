import { EN } from "./en";

export type Language = "tr" | "en";

export const LANGUAGES: { code: Language; native: string; flag: string }[] = [
  { code: "tr", native: "Türkçe", flag: "🇹🇷" },
  { code: "en", native: "English", flag: "🇬🇧" },
];

/**
 * Dil bu telefona özeldir (hesapla eşitlenmez): ortak işletmede bir üyenin dili ötekileri etkilemez.
 * Seçim yoksa telefonun dili Türkçeyse Türkçe, değilse İngilizce açılır.
 */
const LANGUAGE_KEY = "hesabim:language";

function initialLanguage(): Language {
  try {
    const saved = localStorage.getItem(LANGUAGE_KEY);
    if (saved === "tr" || saved === "en") return saved;
  } catch {
    /* depolama erişilemiyorsa telefonun diline bakılır */
  }
  const device = typeof navigator !== "undefined" ? navigator.language.toLowerCase() : "tr";
  return device.startsWith("tr") ? "tr" : "en";
}

let language: Language = initialLanguage();
if (typeof document !== "undefined") document.documentElement.lang = language;

/** Dili değiştirir ve bu telefonda saklar; ekranın yeniden çizilmesini App üstlenir */
export function setLanguage(code: Language) {
  language = code;
  try {
    localStorage.setItem(LANGUAGE_KEY, code);
  } catch {
    /* saklanamazsa yalnızca bu oturumda geçerli */
  }
  if (typeof document !== "undefined") document.documentElement.lang = code;
}

export const getLanguage = (): Language => language;

/** Tarih, sayı ve büyük/küçük harf dönüşümleri için yerel ayar */
export const locale = () => (language === "en" ? "en-US" : "tr-TR");

/**
 * Çeviri: anahtar Türkçe metnin kendisidir. İngilizcede sözlükte karşılığı aranır, yoksa Türkçesi gösterilir.
 * Değişkenler {ad} biçiminde yazılır: t("{n} kişi", { n: 3 }).
 */
export function t(tr: string, vars?: Record<string, string | number>): string {
  const text = language === "en" ? (EN[tr] ?? tr) : tr;
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (m, key) => (key in vars ? String(vars[key]) : m));
}

/** Ülke adı: Türkçede listedeki ad, diğer dillerde telefonun kendi ülke adları */
export function regionName(iso: string, trName: string): string {
  if (language === "tr") return trName;
  try {
    return new Intl.DisplayNames([locale()], { type: "region" }).of(iso) ?? trName;
  } catch {
    return trName;
  }
}

/** Para birimi adı: Türkçede listedeki ad, diğer dillerde telefonun kendi para birimi adları */
export function currencyName(code: string, trName: string): string {
  if (language === "tr") return trName;
  try {
    return new Intl.DisplayNames([locale()], { type: "currency" }).of(code) ?? trName;
  } catch {
    return trName;
  }
}
