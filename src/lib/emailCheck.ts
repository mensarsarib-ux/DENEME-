/**
 * Kayıtta yazılan e-postanın "uydurma" olmadığını, kod göndermeden mümkün olduğunca anlamak için kontroller:
 * 1) Yazım kuralı (isim@alanadi.uzanti, boşluk ve ".." yok, uzantı en az 2 harf)
 * 2) Geçici (tek kullanımlık) e-posta servisleri kabul edilmez
 * 3) Sık yapılan yazım hataları için öneri (gmial.com → gmail.com)
 * 4) Sunucuda alan adının mail alıp alamadığı (MX kaydı) sorulur; sunucuya ulaşılamazsa kullanıcı engellenmez
 * Adresin gerçekten bir kişiye ait olduğu ancak mail gönderilerek kesinleşir; bu kontroller bunu iddia etmez.
 */

const URL_BASE = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/+$/, "") ?? "";
const ANON = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? "";

/** Sık kullanılan alan adları (yazım hatası önerisi bunlara göre yapılır) */
const POPULAR = [
  "gmail.com",
  "hotmail.com",
  "outlook.com",
  "icloud.com",
  "yahoo.com",
  "yandex.com",
  "live.com",
  "msn.com",
  "me.com",
  "hotmail.com.tr",
  "outlook.com.tr",
  "yandex.com.tr",
  "mynet.com",
];

/** Geçici e-posta servisleri */
const DISPOSABLE = [
  "mailinator.com",
  "yopmail.com",
  "guerrillamail.com",
  "sharklasers.com",
  "10minutemail.com",
  "tempmail.com",
  "temp-mail.org",
  "trashmail.com",
  "getnada.com",
  "dispostable.com",
  "maildrop.cc",
  "fakeinbox.com",
  "throwawaymail.com",
  "mohmal.com",
  "emailondeck.com",
];

export type EmailCheck =
  /** suggestion: adres geçerli ama popüler bir alan adının yazım hatasına benziyor; kullanıcıya sorulur */
  | { ok: true; suggestion?: string }
  | { ok: false; reason: "format" | "disposable" | "no_mail"; suggestion?: string };

/** İki metin arasındaki harf farkı sayısı (Levenshtein) */
function distance(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return dp[a.length][b.length];
}

/** Alan adı popüler bir adrese çok benziyorsa (ama aynısı değilse) doğrusunu önerir */
export function suggestEmail(email: string): string | undefined {
  const at = email.lastIndexOf("@");
  if (at < 1) return undefined;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1).toLowerCase();
  if (POPULAR.includes(domain)) return undefined;
  let best: string | undefined;
  let bestD = 3;
  for (const p of POPULAR) {
    const d = distance(domain, p);
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return best && bestD <= 2 ? `${local}@${best}` : undefined;
}

/** Yalnızca yazım kuralı (anında, sunucuya gitmeden) */
export function emailFormatOk(email: string): boolean {
  const e = email.trim();
  if (e.length > 254 || /\s/.test(e) || e.includes("..")) return false;
  return /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/.test(e);
}

/** Alan adının mail alıp alamadığını sunucuya sorar: "ok" | "no_mail" | "unknown" */
async function domainCanReceive(domain: string): Promise<"ok" | "no_mail" | "unknown"> {
  if (!URL_BASE) return "unknown";
  try {
    const res = await fetch(`${URL_BASE}/functions/v1/email-check`, {
      method: "POST",
      headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, "Content-Type": "application/json" },
      body: JSON.stringify({ domain }),
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return "unknown";
    const body = (await res.json()) as { result?: string };
    if (body.result === "ok") return "ok";
    if (body.result === "no_mail" || body.result === "invalid") return "no_mail";
    return "unknown";
  } catch {
    return "unknown";
  }
}

export async function checkEmail(raw: string): Promise<EmailCheck> {
  const email = raw.trim();
  const suggestion = suggestEmail(email);
  if (!emailFormatOk(email)) return { ok: false, reason: "format", suggestion };
  const domain = email.slice(email.lastIndexOf("@") + 1).toLowerCase();
  if (DISPOSABLE.some((d) => domain === d || domain.endsWith(`.${d}`))) return { ok: false, reason: "disposable" };
  // Popüler alan adları için sunucuya sormaya gerek yok
  if (POPULAR.includes(domain)) return { ok: true };
  const result = await domainCanReceive(domain);
  if (result === "no_mail") return { ok: false, reason: "no_mail", suggestion };
  // Alan adı mail alabiliyor ama popüler bir adrese çok benziyor (ör. gmial.com): engellenmez, kullanıcıya sorulur
  return { ok: true, suggestion };
}
