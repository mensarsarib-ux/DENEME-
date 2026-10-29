/**
 * Telefonun bölgesi (ISO ülke kodu, ör. "TR", "DE"): ilk açılıştaki para birimi ve telefon alan kodu buna göre seçilir.
 * Önce telefonun dil-bölge ayarına (tr-TR, en-GB…), o yoksa saat dilimine bakılır.
 */
const TIMEZONE_REGION: Record<string, string> = {
  "Europe/Istanbul": "TR",
  "Europe/London": "GB",
  "Europe/Berlin": "DE",
  "Europe/Paris": "FR",
  "Europe/Madrid": "ES",
  "Europe/Rome": "IT",
  "Europe/Amsterdam": "NL",
  "Europe/Moscow": "RU",
  "Europe/Kiev": "UA",
  "Europe/Kyiv": "UA",
  "Europe/Warsaw": "PL",
  "Asia/Baku": "AZ",
  "Asia/Dubai": "AE",
  "Asia/Riyadh": "SA",
  "Asia/Tokyo": "JP",
  "Asia/Seoul": "KR",
  "Asia/Shanghai": "CN",
  "Asia/Kolkata": "IN",
  "Asia/Jakarta": "ID",
  "America/Sao_Paulo": "BR",
  "America/Mexico_City": "MX",
};

let cached: string | null | undefined;

export function deviceRegion(): string | null {
  if (cached !== undefined) return cached;
  cached = null;
  try {
    const langs = typeof navigator !== "undefined" ? [...(navigator.languages ?? []), navigator.language] : [];
    for (const l of langs) {
      const region = l?.split(/[-_]/)[1];
      if (region && /^[A-Za-z]{2}$/.test(region)) {
        cached = region.toUpperCase();
        return cached;
      }
    }
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    cached = TIMEZONE_REGION[tz] ?? null;
  } catch {
    cached = null;
  }
  return cached;
}
