import { EN } from "./en";

export type Language =
  | "tr"
  | "en"
  | "de"
  | "fr"
  | "es"
  | "it"
  | "pt"
  | "ru"
  | "uk"
  | "pl"
  | "nl"
  | "ar"
  | "id"
  | "hi"
  | "ja"
  | "ko"
  | "zh";

/** Desteklenen diller: kendi dilindeki adı, bayrak, tarih/sayı biçimi ve yazı yönü */
export const LANGUAGES: { code: Language; native: string; flag: string; locale: string; rtl?: boolean }[] = [
  { code: "tr", native: "Türkçe", flag: "🇹🇷", locale: "tr-TR" },
  { code: "en", native: "English", flag: "🇬🇧", locale: "en-US" },
  { code: "de", native: "Deutsch", flag: "🇩🇪", locale: "de-DE" },
  { code: "fr", native: "Français", flag: "🇫🇷", locale: "fr-FR" },
  { code: "es", native: "Español", flag: "🇪🇸", locale: "es-ES" },
  { code: "it", native: "Italiano", flag: "🇮🇹", locale: "it-IT" },
  { code: "pt", native: "Português (Brasil)", flag: "🇧🇷", locale: "pt-BR" },
  { code: "ru", native: "Русский", flag: "🇷🇺", locale: "ru-RU" },
  { code: "uk", native: "Українська", flag: "🇺🇦", locale: "uk-UA" },
  { code: "pl", native: "Polski", flag: "🇵🇱", locale: "pl-PL" },
  { code: "nl", native: "Nederlands", flag: "🇳🇱", locale: "nl-NL" },
  // Muhasebe rakamları okunaklı olsun diye Arapçada Batı rakamları kullanılır
  { code: "ar", native: "العربية", flag: "🇸🇦", locale: "ar-u-nu-latn", rtl: true },
  { code: "id", native: "Bahasa Indonesia", flag: "🇮🇩", locale: "id-ID" },
  { code: "hi", native: "हिन्दी", flag: "🇮🇳", locale: "hi-IN" },
  { code: "ja", native: "日本語", flag: "🇯🇵", locale: "ja-JP" },
  { code: "ko", native: "한국어", flag: "🇰🇷", locale: "ko-KR" },
  { code: "zh", native: "简体中文", flag: "🇨🇳", locale: "zh-CN" },
];

/**
 * Türkçe ve İngilizce uygulamanın içindedir; diğer diller yalnızca seçildiğinde yüklenir (uygulama ağırlaşmaz).
 * Anahtar her zaman Türkçe metindir.
 */
type Dict = Record<string, string>;
const loaders: Partial<Record<Language, () => Promise<{ default: Dict }>>> = {
  de: () => import("./locales/de"),
  fr: () => import("./locales/fr"),
  es: () => import("./locales/es"),
  it: () => import("./locales/it"),
  pt: () => import("./locales/pt"),
  ru: () => import("./locales/ru"),
  uk: () => import("./locales/uk"),
  pl: () => import("./locales/pl"),
  nl: () => import("./locales/nl"),
  ar: () => import("./locales/ar"),
  id: () => import("./locales/id"),
  hi: () => import("./locales/hi"),
  ja: () => import("./locales/ja"),
  ko: () => import("./locales/ko"),
  zh: () => import("./locales/zh"),
};
const dicts: Partial<Record<Language, Dict>> = { en: EN };

/**
 * Dil bu telefona özeldir (hesapla eşitlenmez): ortak işletmede bir üyenin dili ötekileri etkilemez.
 * Seçim yoksa telefonun dillerinden desteklenen ilki, hiçbiri yoksa İngilizce açılır.
 */
const LANGUAGE_KEY = "hesabim:language";
const isLanguage = (v: unknown): v is Language => LANGUAGES.some((l) => l.code === v);

function initialLanguage(): Language {
  try {
    const saved = localStorage.getItem(LANGUAGE_KEY);
    if (isLanguage(saved)) return saved;
  } catch {
    /* depolama erişilemiyorsa telefonun diline bakılır */
  }
  const prefs = typeof navigator !== "undefined" ? [...(navigator.languages ?? []), navigator.language] : [];
  for (const pref of prefs) {
    const base = pref?.toLowerCase().split(/[-_]/)[0];
    if (isLanguage(base)) return base;
  }
  return "en";
}

let language: Language = initialLanguage();

function applyDocument() {
  if (typeof document === "undefined") return;
  document.documentElement.lang = language;
  document.documentElement.dir = LANGUAGES.find((l) => l.code === language)?.rtl ? "rtl" : "ltr";
}

async function loadDict(code: Language) {
  const load = loaders[code];
  if (!dicts[code] && load) {
    try {
      dicts[code] = (await load()).default;
    } catch {
      /* yüklenemezse metinler İngilizce gösterilir */
    }
  }
}

/** Açılışta seçili dilin sözlüğünü yükler; ilk çizimden önce beklenir */
export async function initLanguage() {
  await loadDict(language);
  applyDocument();
}

/** Dili değiştirir ve bu telefonda saklar; ekranın yeniden çizilmesini App üstlenir */
export async function setLanguage(code: Language) {
  await loadDict(code);
  language = code;
  try {
    localStorage.setItem(LANGUAGE_KEY, code);
  } catch {
    /* saklanamazsa yalnızca bu oturumda geçerli */
  }
  applyDocument();
}

export const getLanguage = (): Language => language;

/** Tarih, sayı ve büyük/küçük harf dönüşümleri için yerel ayar */
export const locale = () => LANGUAGES.find((l) => l.code === language)?.locale ?? "en-US";

/**
 * Çeviri: anahtar Türkçe metnin kendisidir. Seçili dilde karşılığı yoksa İngilizcesi, o da yoksa Türkçesi gösterilir.
 * Değişkenler {ad} biçiminde yazılır: t("{n} kişi", { n: 3 }).
 */
export function t(tr: string, vars?: Record<string, string | number>): string {
  const text = language === "tr" ? tr : (dicts[language]?.[tr] ?? EN[tr] ?? tr);
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
