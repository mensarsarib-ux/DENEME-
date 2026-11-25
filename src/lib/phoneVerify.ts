/**
 * Telefon numarasını SMS koduyla doğrulama (Firebase Authentication).
 * Firebase yalnızca numarayı doğrulamak için kullanılır: kod doğru girilince Firebase'in imzalı kimlik belirteci
 * (ID token) alınır ve sunucumuza (phone-verify) gönderilir; Firebase oturumu hemen kapatılır.
 * iPhone ve Android'de yerel eklenti, web'de Firebase'in JavaScript kütüphanesi (yalnızca gerektiğinde yüklenir) kullanılır.
 *
 * Kötüye kullanım sınırları (SMS ücretli): aynı numaraya ilk yeniden gönderim 1 dakika, sonrakiler 2 dakika sonra;
 * saatte en fazla 5 kod;
 * bir cihaz 24 saatte en fazla 4 farklı numaraya kod isteyebilir.
 * Sayaçlar iPhone'da Keychain'de tutulur; uygulama silinip yeniden kurulunca sıfırlanmaz.
 */
import { Capacitor } from "@capacitor/core";
import { t } from "./i18n";
import { trackEvent } from "./tapTrack";
import { sendWaCode } from "./cloud";

const DAY_MS = 24 * 60 * 60 * 1000;
const STORE_KEY = "hesabim-sms-log";

export type SmsErrorCode =
  /** Aynı numaraya yeni kod için beklemek gerekiyor (seconds dolu) */
  | "wait"
  /** Bu numaraya saatlik sınır doldu */
  | "hourly"
  /** Bu cihazdan bugün başka numaralara kod istendi */
  | "device"
  /** Numara geçersiz */
  | "invalid_phone"
  /** Kod hatalı */
  | "invalid_code"
  /** Kodun süresi doldu; yeni kod istenmeli */
  | "expired"
  /** Firebase çok fazla istek dedi */
  | "quota"
  /** Firebase bu cihazı olağandışı etkinlik nedeniyle geçici olarak engelledi */
  | "blocked"
  /** Uygulama doğrulaması (Apple bildirim jetonu) başarısız */
  | "app_verify"
  /** Numaranın ülkesine SMS gönderimi kapalı (SMS bölge politikası) */
  | "region"
  /** Bağlantı ya da bilinmeyen hata */
  | "failed";

export class SmsError extends Error {
  constructor(
    public code: SmsErrorCode,
    public seconds = 0,
    /** Firebase'in ham hata metni (tanılama için ekranda kısaca gösterilir ve kaydedilir) */
    public detail = "",
  ) {
    super(code);
  }
}

// ---------- Cihazdaki sayaçlar ----------

interface SendLog {
  phone: string;
  at: number;
}

async function readLog(): Promise<SendLog[]> {
  try {
    let raw: string | null = null;
    if (Capacitor.isNativePlatform()) {
      const { SecureStorage } = await import("@aparajita/capacitor-secure-storage");
      raw = await SecureStorage.getItem(STORE_KEY);
    } else {
      raw = localStorage.getItem(STORE_KEY);
    }
    const list = JSON.parse(raw ?? "[]") as SendLog[];
    return Array.isArray(list) ? list.filter((e) => Date.now() - e.at < DAY_MS) : [];
  } catch {
    return [];
  }
}

async function writeLog(list: SendLog[]): Promise<void> {
  const raw = JSON.stringify(list.filter((e) => Date.now() - e.at < DAY_MS));
  try {
    if (Capacitor.isNativePlatform()) {
      const { SecureStorage } = await import("@aparajita/capacitor-secure-storage");
      await SecureStorage.setItem(STORE_KEY, raw);
    } else {
      localStorage.setItem(STORE_KEY, raw);
    }
  } catch {
    // Yazılamazsa sınır yalnızca Firebase'in kendi korumasıyla kalır
  }
}

/** Uygulama içi bekleme yok: yeniden gönderim her zaman açık */
export async function resendWait(_phone: string): Promise<number> {
  return 0;
}

// ---------- Firebase ----------

/** Firebase hata metninden bizim hata kodumuza */
function mapError(e: unknown): SmsError {
  if (e instanceof SmsError) return e;
  const raw = `${(e as { code?: string })?.code ?? ""} ${(e as Error)?.message ?? ""}`.trim();
  const text = raw.toLowerCase();
  const err = (code: SmsErrorCode) => new SmsError(code, 0, raw);
  // Firebase cihazı geçici engelledi: "We have blocked all requests from this device due to unusual activity"
  if (text.includes("unusual activity") || text.includes("blocked all requests") || text.includes("too_many") || text.includes("17010"))
    return err("blocked");
  // Apple bildirim jetonuyla uygulama doğrulaması başarısız (APNs anahtarı ya da jeton uyuşmazlığı)
  if (text.includes("apns") || text.includes("app credential") || text.includes("app_credential") || text.includes("canhandlenotification"))
    return err("app_verify");
  if (text.includes("region") || text.includes("operation-not-allowed") || text.includes("operation_not_allowed")) return err("region");
  if (text.includes("invalid-phone") || text.includes("invalid phone") || text.includes("invalid format")) return err("invalid_phone");
  if (text.includes("invalid-verification-code") || text.includes("verification code") && text.includes("invalid")) return err("invalid_code");
  if (text.includes("code-expired") || text.includes("session-expired") || text.includes("expired")) return err("expired");
  if (text.includes("too-many") || text.includes("too many") || text.includes("quota")) return err("quota");
  return err("failed");
}

/** Kod artık WhatsApp'tan gelir ve uygulama kapansa da sunucudan yeniden istenir: bekleyen Firebase kodu yoktur */
export function hasPendingCode(_phone: string): boolean {
  return false;
}

/** Son kod istenen numara: kod girilince kanıt bu numaradan kurulur (kod sunucuda doğrulanır) */
let waPhone: string | null = null;

/**
 * Numaraya WhatsApp ile 6 haneli giriş kodu gönderir (onaylı "hesabim_giris_kodu" şablonu).
 * Firebase kullanılmaz. Sunucu sınırları: aynı numaraya 5 dakikada 1, saatte en fazla 3 kod.
 */
export async function sendSmsCode(phone: string, _onAutoVerified?: (idToken: string) => void): Promise<void> {
  let res: Response;
  try {
    res = await sendWaCode(phone);
  } catch {
    trackEvent("sms_hata", "failed:network");
    throw new SmsError("failed", 0, "network");
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string; seconds?: number };
    const err =
      res.status === 429 && body.error === "hourly"
        ? new SmsError("hourly")
        : res.status === 429 && body.error === "device"
          ? new SmsError("device")
        : res.status === 429
          ? new SmsError("wait", body.seconds ?? 60)
          : res.status === 400
            ? new SmsError("invalid_phone")
            : new SmsError("failed", 0, `wa-${res.status}`);
    trackEvent("sms_hata", `${err.code}:${err.detail}`);
    throw err;
  }
  waPhone = phone;
  const log = await readLog();
  log.push({ phone, at: Date.now() });
  await writeLog(log);
}

/** Girilen 6 haneli kodu kanıta çevirir; kodun doğruluğunu sunucu numaraya göre yeniden hesaplayıp kontrol eder */
export async function confirmSmsCode(code: string): Promise<string> {
  const c = code.trim();
  if (!/^\d{6}$/.test(c)) throw new SmsError("invalid_code");
  if (!waPhone) throw new SmsError("expired");
  return `wa:${waPhone}:${c}`;
}

/** Hata için kullanıcıya gösterilecek metin */
export function smsErrorText(e: unknown): string {
  const err = e instanceof SmsError ? e : mapError(e);
  switch (err.code) {
    case "wait":
      return err.seconds < 60
        ? t("Bu numaraya az önce kod gönderdik. Yeni kod için {s} saniye bekleyin.", { s: err.seconds })
        : t("Bu numaraya az önce kod gönderdik. Yeni kod için {m} dakika bekleyin.", { m: Math.ceil(err.seconds / 60) });
    case "hourly":
      return t("Bu numaraya bir saatte en fazla 3 kod gönderilebilir. Biraz sonra tekrar deneyin.");
    case "device":
      return t("Bu cihazdan bugün başka numaralara kod gönderildi. Yarın tekrar deneyin.");
    case "invalid_phone":
      return t("Telefon numarası geçersiz.");
    case "invalid_code":
      return t("Kod hatalı ya da süresi dolmuş. Yeni kod isteyin.");
    case "expired":
      return t("Kodun süresi doldu. Yeni kod isteyin.");
    case "region":
      return t("Şimdilik yalnızca Türkiye numaralarına kod gönderilebiliyor.");
    case "quota":
      return t("Çok fazla deneme yapıldı. Birkaç dakika sonra tekrar deneyin.");
    case "blocked":
      return t("Bu telefondan kısa sürede çok fazla kod istendiği için SMS servisi geçici olarak engelledi. Birkaç saat sonra tekrar deneyin.");
    case "app_verify":
      return `${t("Uygulama doğrulanamadı; kod gönderilemedi. Uygulamayı kapatıp yeniden açın.")}${err.detail ? ` (${err.detail.slice(0, 120)})` : ""}`;
    default:
      return `${t("Kod gönderilemedi; bağlantınızı kontrol edip tekrar deneyin.")}${err.detail ? ` (${err.detail.slice(0, 120)})` : ""}`;
  }
}
