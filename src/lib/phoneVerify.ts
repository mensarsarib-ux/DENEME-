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
import { firebaseConfig } from "./firebaseConfig";
import { t } from "./i18n";

const DAY_MS = 24 * 60 * 60 * 1000;
const STORE_KEY = "hesabim-sms-log";
/** Gönderilen son kodun doğrulama kimliği: uygulama kapanıp açılsa da kod girilebilsin */
const PENDING_KEY = "hesabim-sms-bekleyen";
/** Firebase SMS kodu bu süre boyunca geçerli kabul edilir */
const CODE_VALID_MS = 10 * 60 * 1000;

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
  /** Numaranın ülkesine SMS gönderimi kapalı (SMS bölge politikası) */
  | "region"
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

/** Uygulama içi bekleme yok: yeniden gönderim her zaman açık */
export async function resendWait(_phone: string): Promise<number> {
  return 0;
}

// ---------- Firebase ----------

/** Firebase hata metninden bizim hata kodumuza */
function mapError(e: unknown): SmsError {
  if (e instanceof SmsError) return e;
  const text = `${(e as { code?: string })?.code ?? ""} ${(e as Error)?.message ?? ""}`.toLowerCase();
  if (text.includes("region") || text.includes("operation-not-allowed") || text.includes("operation_not_allowed")) return new SmsError("region");
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

function savePending(phone: string, verificationId: string) {
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify({ phone, verificationId, at: Date.now() }));
  } catch {
    /* yazılamazsa yalnızca bu oturumda geçerli */
  }
}

/**
 * Bu numaraya az önce gönderilmiş ve hâlâ girilebilecek bir kod var mı? Varsa doğrulama kimliği geri yüklenir;
 * kullanıcı yeni kod beklemek yerine gelen SMS'teki kodu girer (uygulama kapatılıp açılsa da).
 */
export function hasPendingCode(phone: string): boolean {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const p = JSON.parse(localStorage.getItem(PENDING_KEY) ?? "null") as { phone: string; verificationId: string; at: number } | null;
    if (!p || p.phone !== phone || Date.now() - p.at > CODE_VALID_MS) return false;
    nativeVerificationId = p.verificationId;
    nativeAutoToken = null;
    return true;
  } catch {
    return false;
  }
}
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
          savePending(phone, event.verificationId);
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
      const token = await nativeToken();
      // Kod kullanıldı: bir sonraki girişte eski doğrulama kimliği geri yüklenmez
      try {
        localStorage.removeItem(PENDING_KEY);
      } catch {
        /* sessizce geç */
      }
      return token;
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
      return err.seconds < 60
        ? t("Bu numaraya az önce kod gönderdik. Yeni kod için {s} saniye bekleyin.", { s: err.seconds })
        : t("Bu numaraya az önce kod gönderdik. Yeni kod için {m} dakika bekleyin.", { m: Math.ceil(err.seconds / 60) });
    case "hourly":
      return t("Bu numaraya bir saatte en fazla 5 kod gönderilebilir. Biraz sonra tekrar deneyin.");
    case "device":
      return t("Bu cihazdan bugün başka numaralara kod gönderildi. Yarın tekrar deneyin.");
    case "invalid_phone":
      return t("Telefon numarası geçersiz.");
    case "invalid_code":
      return t("Kod hatalı ya da süresi dolmuş. Yeni kod isteyin.");
    case "expired":
      return t("Kodun süresi doldu. Yeni kod isteyin.");
    case "region":
      return t("Şimdilik yalnızca Türkiye numaralarına SMS gönderilebiliyor.");
    case "quota":
      return t("Çok fazla deneme yapıldı. Birkaç dakika sonra tekrar deneyin ya da E-posta ile giriş yapın.");
    default:
      return t("SMS gönderilemedi; bağlantınızı kontrol edip tekrar deneyin.");
  }
}
