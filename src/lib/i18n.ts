/** Uygulama yalnızca Türkçe. Metinler doğrudan Türkçe yazılır; {ad} biçimindeki değişkenler doldurulur. */
export const locale = () => "tr-TR";

/** Metni döndürür; değişkenler: t("{n} kişi", { n: 3 }) */
export function t(text: string, vars?: Record<string, string | number>): string {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (m, key) => (key in vars ? String(vars[key]) : m));
}
