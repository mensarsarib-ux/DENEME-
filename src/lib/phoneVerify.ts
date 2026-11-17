/**
 * Telefon numarasını SMS koduyla doğrulama (Firebase Authentication).
 * Firebase yalnızca numarayı doğrulamak için kullanılır: kod doğru girilince Firebase'in imzalı kimlik belirteci
 * (ID token) alınır ve sunucumuza (phone-verify) gönderilir; Firebase oturumu hemen kapatılır.
 * iPhone ve Android'de yerel eklenti, web'de Firebase'in JavaScript kütüphanesi (yalnızca gerektiğinde yüklenir) kullanılır.
 *
 * Kötüye kullanım sınırları (SMS ücretli): aynı numaraya ilk yeniden gönderim 1 dakika, sonrakiler 5 dakika sonra;
 * saatte en fazla 3 kod;
 * bir cihaz 24 saatte en fazla 4 farklı numaraya kod isteyebilir.
 * Sayaçlar iPhone'da Keychain'de tutulur; uygulama silinip yeniden kurulunca sıfırlanmaz.
 */
import { Capacitor } from "@capacitor/core";
import { firebaseConfig } from "./firebaseConfig";
import { t } from "./i18n";

const FIRST_WAIT_MS = 60 * 1000;
const WAIT_MS = 5 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const MAX_PER_HOUR = 3;
const MAX_NUMBERS_PER_DAY = 4;
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
  /** Bağlantı ya da bilinmeyen hata */
  | "failed";

export class SmsError extends Error {
  constructor(
    public code: SmsErrorCode,
    public seconds = 0,
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

/** Son gönderimden sonra beklenecek süre: son bir saatte tek kod gittiyse 1 dakika, daha fazlaysa 5 dakika */
function waitAfter(same: SendLog[], now: number): number {
  return same.filter((e) => now - e.at < HOUR_MS).length <= 1 ? FIRST_WAIT_MS : WAIT_MS;
}

/** Bu numaraya şimdi kod gönderilebilir mi? Gönderilemiyorsa SmsError fırlatır. */
async function checkLimits(phone: string): Promise<void> {
  const log = await readLog();
  const now = Date.now();
  const same = log.filter((e) => e.phone === phone);
  const last = same.reduce((m, e) => Math.max(m, e.at), 0);
  const wait = waitAfter(same, now);
  if (last && now - last < wait) throw new SmsError("wait", Math.ceil((wait - (now - last)) / 1000));
  if (same.filter((e) => now - e.at < HOUR_MS).length >= MAX_PER_HOUR) throw new SmsError("hourly");
  const others = new Set(log.filter((e) => e.phone !== phone).map((e) => e.phone));
  // Yeni bir numara: son 24 saatte en fazla MAX_NUMBERS_PER_DAY farklı numaraya kod gidebilir
  if (same.length === 0 && others.size >= MAX_NUMBERS_PER_DAY) throw new SmsError("device");
}

/** Aynı numaraya yeniden gönderim için kalan süre (sn); beklemek gerekmiyorsa 0 */
export async function resendWait(phone: string): Promise<number> {
  const now = Date.now();
  const same = (await readLog()).filter((e) => e.phone === phone);
  const last = same.reduce((m, e) => Math.max(m, e.at), 0);
  return last ? Math.max(0, Math.ceil((waitAfter(same, now) - (now - last)) / 1000)) : 0;
}

// ---------- Firebase ----------

/** Firebase hata metninden bizim hata kodumuza */
function mapError(e: unknown): SmsError {
  if (e instanceof SmsError) return e;
  const text = `${(e as { code?: string })?.code ?? ""} ${(e as Error)?.message ?? ""}`.toLowerCase();
  if (text.includes("invalid-phone") || text.includes("invalid phone") || text.includes("invalid format")) return new SmsError("invalid_phone");
  if (text.includes("invalid-verification-code") || text.includes("verification code") && text.includes("invalid")) return new SmsError("invalid_code");
  if (text.includes("code-expired") || text.includes("session-expired") || text.includes("expired")) return new SmsError("expired");
  if (text.includes("too-many") || text.includes("too many") || text.includes("quota")) return new SmsError("quota");
  return new SmsError("failed");
}

// Web: Firebase JavaScript kütüphanesi ve reCAPTCHA (görünmez)
type WebConfirmation = { confirm: (code: string) => Promise<{ user: { getIdToken: () => Promise<string> } }> };
let webConfirmation: WebConfirmation | null = null;
let webVerifier: { clear: () => void } | null = null;

async function webAuth() {
  const [{ initializeApp, getApps }, auth] = await Promise.all([import("firebase/app"), import("firebase/auth")]);
  const app = getApps()[0] ?? initializeApp(firebaseConfig);
  const instance = auth.getAuth(app);
  instance.languageCode = document.documentElement.lang || "tr";
  return { auth, instance };
}

// Yerel: eklentinin verdiği doğrulama kimliği
let nativeVerificationId: string | null = null;
/** Android bazen SMS'i kendisi okuyup doğrular; o durumda belirteç doğrudan buraya düşer */
let nativeAutoToken: string | null = null;

async function nativeToken(): Promise<string> {
  const { FirebaseAuthentication } = await import("@capacitor-firebase/authentication");
  const { token } = await FirebaseAuthentication.getIdToken({ forceRefresh: true });
  // Firebase oturumu uygulamanın oturumu değildir; belirteç alınır alınmaz kapatılır
  await FirebaseAuthentication.signOut().catch(() => undefined);
  return token;
}

/**
 * Numaraya SMS kodu gönderir. phone +90… biçiminde olmalıdır.
 * Android SMS'i kendiliğinden doğrularsa onAutoVerified çağrılır (kod yazmaya gerek kalmaz).
 */
export async function sendSmsCode(phone: string, onAutoVerified?: (idToken: string) => void): Promise<void> {
  await checkLimits(phone);
  try {
    if (Capacitor.isNativePlatform()) {
      const { FirebaseAuthentication } = await import("@capacitor-firebase/authentication");
      await FirebaseAuthentication.removeAllListeners();
      nativeVerificationId = null;
      nativeAutoToken = null;
      await FirebaseAuthentication.setLanguageCode({ languageCode: document.documentElement.lang || "tr" }).catch(() => undefined);
      await new Promise<void>((resolve, reject) => {
        let settled = false;
        const done = (fn: () => void) => {
          if (settled) return;
          settled = true;
          fn();
        };
        void FirebaseAuthentication.addListener("phoneCodeSent", (event) => {
          nativeVerificationId = event.verificationId;
          done(resolve);
        });
        void FirebaseAuthentication.addListener("phoneVerificationFailed", (event) => {
          done(() => reject(mapError({ message: event.message })));
        });
        void FirebaseAuthentication.addListener("phoneVerificationCompleted", () => {
          void nativeToken()
            .then((token) => {
              nativeAutoToken = token;
              onAutoVerified?.(token);
            })
            .catch(() => undefined);
          done(resolve);
        });
        FirebaseAuthentication.signInWithPhoneNumber({ phoneNumber: phone }).catch((e) => done(() => reject(mapError(e))));
      });
    } else {
      const { auth, instance } = await webAuth();
      webVerifier?.clear();
      let holder = document.getElementById("sms-recaptcha");
      if (!holder) {
        holder = document.createElement("div");
        holder.id = "sms-recaptcha";
        document.body.appendChild(holder);
      }
      const verifier = new auth.RecaptchaVerifier(instance, holder, { size: "invisible" });
      webVerifier = verifier;
      webConfirmation = await auth.signInWithPhoneNumber(instance, phone, verifier);
    }
  } catch (e) {
    throw mapError(e);
  }
  const log = await readLog();
  log.push({ phone, at: Date.now() });
  await writeLog(log);
}

/** SMS kodunu doğrular ve Firebase kimlik belirtecini döndürür (sunucuya gönderilecek) */
export async function confirmSmsCode(code: string): Promise<string> {
  try {
    if (Capacitor.isNativePlatform()) {
      if (nativeAutoToken) return nativeAutoToken;
      if (!nativeVerificationId) throw new SmsError("expired");
      const { FirebaseAuthentication } = await import("@capacitor-firebase/authentication");
      await FirebaseAuthentication.confirmVerificationCode({ verificationId: nativeVerificationId, verificationCode: code });
      return await nativeToken();
    }
    if (!webConfirmation) throw new SmsError("expired");
    const result = await webConfirmation.confirm(code);
    const token = await result.user.getIdToken();
    const { instance } = await webAuth();
    await instance.signOut().catch(() => undefined);
    return token;
  } catch (e) {
    throw mapError(e);
  }
}

/** Hata için kullanıcıya gösterilecek metin */
export function smsErrorText(e: unknown): string {
  const err = e instanceof SmsError ? e : mapError(e);
  switch (err.code) {
    case "wait":
      return t("Yeni kod için {m} dakika bekleyin.", { m: Math.max(1, Math.ceil(err.seconds / 60)) });
    case "hourly":
      return t("Bu numaraya bir saatte en fazla 3 kod gönderilebilir. Daha sonra tekrar deneyin.");
    case "device":
      return t("Bu cihazdan bugün başka numaralara kod gönderildi. Yarın tekrar deneyin.");
    case "invalid_phone":
      return t("Telefon numarası geçersiz.");
    case "invalid_code":
      return t("Kod hatalı ya da süresi dolmuş. Yeni kod isteyin.");
    case "expired":
      return t("Kodun süresi doldu. Yeni kod isteyin.");
    case "quota":
      return t("Çok fazla deneme yapıldı. Biraz sonra tekrar deneyin.");
    default:
      return t("SMS gönderilemedi; bağlantınızı kontrol edip tekrar deneyin.");
  }
}
