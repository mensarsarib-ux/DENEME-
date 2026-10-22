import { EN } from "./en";

export type Language = "tr" | "en";

export const LANGUAGES: { code: Language; name: string; native: string; flag: string }[] = [
  { code: "tr", name: "Türkçe", native: "Türkçe", flag: "🇹🇷" },
  { code: "en", name: "English", native: "English", flag: "🇬🇧" },
];

/** Etkin dil; ayarlardan seçilince App tarafından güncellenir */
let language: Language = "tr";

export function setLanguage(code: Language) {
  language = code;
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
