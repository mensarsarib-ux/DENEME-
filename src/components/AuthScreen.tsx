import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Capacitor } from "@capacitor/core";
import { Keyboard } from "@capacitor/keyboard";
import {
  attachVerifiedPhone,
  checkVerifiedPhone,
  CloudError,
  findBusinessByOwnerEmail,
  normalizePhone,
  resetPasswordByPhone,
  requestJoin,
  resendSignupCode,
  saveSession,
  sendResetEmail,
  setPassword,
  signIn,
  signUp,
  verifyRecoveryCode,
  verifySignupCode,
  type Session,
} from "../lib/cloud";
import { haptic } from "../lib/haptics";
import { getLanguage, t } from "../lib/i18n";
import { legalBase } from "../lib/platform";
import { confirmSmsCode, resendWait, sendSmsCode, smsErrorText } from "../lib/phoneVerify";
import { Svg } from "./Icon";
import PhoneField from "./PhoneField";
import { checkEmail } from "../lib/emailCheck";

/**
 * Açılış ve hesap ekranları. Açılışta logo, ardından Giriş yap / Üye ol / Ekibe katıl.
 * Üye ol ve Ekibe katıl her adımda tek soru soran sihirbazlardır. Telefon SMS koduyla doğrulanır; e-posta kodu
 * Supabase'deki "Confirm email" ayarına bağlıdır (ayar kapalıysa kod ekranı kendiliğinden atlanır, e-posta sonradan
 * menüden doğrulanır). Girişte e-posta ya da telefon ve şifre kullanılır. Şifremi unuttum: e-posta kodu ya da SMS.
 */
type Screen =
  | "welcome"
  | "login"
  | "verify"
  | "forgot"
  | "forgot-sms"
  | "reset-code"
  | "new-password"
  | "reg-business"
  | "reg-phone"
  | "reg-sms"
  | "reg-email"
  | "reg-password"
  | "reg-code"
  | "reg-done"
  | "join-phone"
  | "join-sms"
  | "join-email"
  | "join-password"
  | "join-code"
  | "join-owner"
  | "join-sent";

/** Sihirbaz adımları (ilerleme çizgisi için) */
const REGISTER: Screen[] = ["reg-business", "reg-phone", "reg-sms", "reg-email", "reg-code", "reg-password"];
const JOIN: Screen[] = ["join-phone", "join-sms", "join-email", "join-code", "join-password", "join-owner"];

/** SMS kodu ekranları ve hangi amaçla kullanıldıkları */
const SMS_SCREENS = ["reg-sms", "join-sms", "forgot-sms"] as const;
type SmsScreen = (typeof SMS_SCREENS)[number];
const isSmsScreen = (s: Screen): s is SmsScreen => (SMS_SCREENS as readonly string[]).includes(s);

/** Geri düğmesinin götürdüğü ekran; yoksa geri düğmesi gösterilmez */
const BACK: Partial<Record<Screen, Screen>> = {
  login: "welcome",
  verify: "login",
  forgot: "login",
  "reset-code": "forgot",
  "forgot-sms": "forgot",
  "reg-business": "welcome",
  "reg-phone": "reg-business",
  // SMS kodu ekranından numaraya dönülür: yanlış yazılan numara düzeltilir
  "reg-sms": "reg-phone",
  // Telefon doğrulandıktan sonra geri: numara yeniden girilir
  "reg-email": "reg-phone",
  // Kod ekranından e-postaya dönülür: yanlış yazılan adres düzeltilip yeni kod istenir
  "reg-code": "reg-email",
  // Kod doğrulandıktan sonraki adımlardan geri: kayıt yarıda bırakılır, açılışa dönülür.
  // E-posta doğrulanmış kalır; aynı adresle "Giriş yap → Şifremi unuttum" ile devam edilebilir.
  "reg-password": "welcome",
  "join-phone": "welcome",
  "join-sms": "join-phone",
  "join-email": "join-phone",
  "join-code": "join-email",
  "join-password": "welcome",
  "join-owner": "welcome",
  "new-password": "login",
};

/** Hesap ilk açılışta rastgele bir şifreyle oluşturulur; gerçek şifre e-posta kodu doğrulandıktan sonra belirlenir */
const randomPassword = () => Array.from(crypto.getRandomValues(new Uint8Array(24)), (b) => b.toString(36)).join("");

/** E-posta kodu tekrar gönderilmeden önce beklenen süre (sn); Supabase aynı adrese 60 sn'de bir e-posta gönderir */
const RESEND_WAIT = 60;

/** Kelimeler arasına boşluk koymayan diller (onay cümlesinin parçaları bitişik yazılır) */
const TIGHT = ["ja", "zh"];
/** Cümle sonu parçası bir önceki kelimeye bitişen diller (Korecede ek, Japonca ve Çincede boşluksuz yazım) */
const ATTACHED_END = ["ja", "zh", "ko"];

/** Kayıt ekranındaki yasal sayfalar; Türkçe dışındaki dillerde İngilizce sayfalar açılır */
/** 6698 sayılı KVKK aydınlatma metni (Türkçe; Türkiye'deki kullanıcılar için zorunlu bilgilendirme) */
const KVKK_URL = `${legalBase()}/kvkk.html`;

const legalUrl = (page: "terms" | "privacy") =>
  getLanguage() === "tr"
    ? `${legalBase()}/${page === "terms" ? "kullanim-kosullari" : "gizlilik"}.html`
    : `${legalBase()}/en/${page}.html`;

export default function AuthScreen({
  recoveryToken,
  onSession,
  onRecoveryDone,
}: {
  /** E-postadaki şifre sıfırlama bağlantısından gelindiyse geçici belirteç */
  recoveryToken?: string | null;
  /** Giriş başarılı olunca; yeni kayıtta isNew ve işletme adı da gelir */
  onSession: (session: Session, info?: { isNew: boolean; businessName: string }) => void;
  onRecoveryDone: () => void;
}) {
  const [screen, setScreen] = useState<Screen>(recoveryToken ? "new-password" : "welcome");
  // Girişte e-posta mı telefon mu kullanılıyor
  const [method, setMethod] = useState<"email" | "phone">("email");
  const [business, setBusiness] = useState("");
  const [email, setEmail] = useState("");
  // Girişte telefon kutusu ayrı tutulur: e-posta ve telefon birbirinin kutusuna ya da şifre yenilemeye geçmez
  const [loginPhoneInput, setLoginPhoneInput] = useState("");
  // E-posta kontrolü: yazım hatası önerisi ve "yine de bu adresle devam" onayı
  const [emailSuggestion, setEmailSuggestion] = useState<string | null>(null);
  const [emailOddConfirmed, setEmailOddConfirmed] = useState<string | null>(null);
  const [password, setPassword1] = useState("");
  const [show, setShow] = useState(false);
  const [code, setCode] = useState("");
  const [owner, setOwner] = useState("");
  // Giriş ekranı "Ekibe katıl" için açıldıysa: giriş sonrası ekip katılma adımına geçilir
  const [loginForJoin, setLoginForJoin] = useState(false);
  // Kayıt: telefon numarası, SMS'in gönderildiği numara ve doğrulanınca Firebase'in verdiği belirteç
  const [phone, setPhone] = useState("");
  const [smsTo, setSmsTo] = useState<string | null>(null);
  const [phoneToken, setPhoneToken] = useState<string | null>(null);
  // Doğrulanan telefon hesaba yazılamadıysa kayıt sonunda kullanıcıya gösterilir
  const [phoneSaveFailed, setPhoneSaveFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  // Kodun gönderildiği e-posta ve doğrulanmış oturum (şifre belirlenip cihaza yazılana kadar)
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [pendingSession, setPendingSession] = useState<Session | null>(null);
  // Şifre sıfırlama: e-postadaki bağlantının verdiği geçici anahtar
  const [resetToken, setResetToken] = useState<string | null>(recoveryToken ?? null);
  // Şifremi unuttum: e-posta mı telefon mu; telefonla yenilemede SMS doğrulanınca Firebase belirteci
  const [forgotMethod, setForgotMethod] = useState<"email" | "phone">("email");
  const [forgotPhoneInput, setForgotPhoneInput] = useState("");
  const [resetPhoneToken, setResetPhoneToken] = useState<string | null>(null);
  // Kod tekrar gönderilebilene kadar kalan süre
  const [resendIn, setResendIn] = useState(0);
  // Klavye yüksekliği: alttaki düğme klavyenin üstünde kalsın diye ekranın altına bu kadar boşluk bırakılır
  const [keyboard, setKeyboard] = useState(0);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      const showKb = Keyboard.addListener("keyboardWillShow", (kb) => setKeyboard(kb.keyboardHeight));
      const hideKb = Keyboard.addListener("keyboardWillHide", () => setKeyboard(0));
      return () => {
        void showKb.then((h) => h.remove());
        void hideKb.then((h) => h.remove());
      };
    }
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => setKeyboard(Math.max(0, window.innerHeight - vv.height));
    vv.addEventListener("resize", update);
    return () => vv.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = window.setTimeout(() => setResendIn((n) => n - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [resendIn]);

  // Girişte kimlik: e-posta ya da telefon (+90… biçiminde)
  const ownerId = owner.includes("@") ? owner.trim() : normalizePhone(owner) ?? "";
  const validEmail = /^\S+@\S+\.\S+$/.test(email.trim());
  const loginPhone = normalizePhone(loginPhoneInput) ?? "";
  const validLogin = method === "email" ? validEmail : loginPhone !== "";
  const validOwner = ownerId.includes("@") ? /^\S+@\S+\.\S+$/.test(ownerId) : ownerId !== "";
  const validCode = /^\d{6,8}$/.test(code);
  const regPhone = normalizePhone(phone) ?? "";
  const forgotPhone = normalizePhone(forgotPhoneInput) ?? "";
  const strongEnough = password.length >= 6;

  function go(next: Screen) {
    haptic("light");
    // Ekibe katılım girişi yalnızca giriş ekranında geçerli; başka yere gidilince sıfırlanır
    if (next !== "login") setLoginForJoin(false);
    setScreen(next);
    setError(null);
    setInfo(null);
  }

  function describe(e: unknown): string {
    const reason = e instanceof CloudError ? e.code : "unknown";
    switch (reason) {
      case "invalid_credentials": return t("Bilgiler veya şifre hatalı.");
      case "no_account": return t("Bu telefon numarasına bağlı hesap yok. E-posta adresinizle giriş yapın.");
      case "email_taken": return t("Bu e-posta ile zaten bir hesap var; giriş yapın.");
      case "phone_taken": return t("Bu telefon numarası başka bir hesapta kullanılıyor.");
      case "too_many_attempts": return t("Çok fazla hatalı deneme yapıldı. 15 dakika sonra tekrar deneyin.");
      case "weak_password": return t("Şifre en az 6 karakter olmalı.");
      case "email_not_confirmed": return t("E-postanız henüz doğrulanmadı. E-postanıza gelen 6 haneli kodu girin.");
      case "network": return t("Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edin.");
      default: return t("Bir sorun oluştu; biraz sonra tekrar deneyin.");
    }
  }

  /** Bir işlemi meşgul göstergesi ve hata mesajıyla çalıştırır */
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      haptic("warning");
      setError(describe(e));
    } finally {
      setBusy(false);
    }
  }

  /** Doğrulama kodu ekranına geçer; kod e-postaya gönderildi */
  function codeSent(address: string, next: Screen) {
    setPendingEmail(address);
    setCode("");
    setResendIn(RESEND_WAIT);
    go(next);
    setInfo(t("{m} adresine 6 haneli bir doğrulama kodu gönderdik.", { m: address }));
  }

  /** Numaraya SMS kodu gönderir ve verilen kod ekranını açar (kayıt, ekibe katılma ya da şifre yenileme) */
  async function sendSms(to: string, codeScreen: SmsScreen) {
    await sendSmsCode(to, (idToken) => void smsVerified(idToken, codeScreen));
    haptic("success");
    setSmsTo(to);
    setCode("");
    setResendIn(await resendWait(to));
    if (screen !== codeScreen) go(codeScreen);
    setInfo(t("{p} numarasına SMS ile 6 haneli bir kod gönderdik.", { p: to }));
  }

  /**
   * SMS kodu doğrulandı. Kayıt ve ekibe katılmada numara başka bir hesapta doğrulanmışsa durulur.
   * Şifre yenilemede numara doğrulanmış bir hesaba ait olmalıdır (doğrulanmamış numarayla şifre değiştirilemez).
   */
  async function smsVerified(idToken: string, codeScreen: SmsScreen) {
    const r = await checkVerifiedPhone(idToken);
    if (codeScreen === "forgot-sms") {
      if (!r.taken) {
        haptic("warning");
        setError(t("Bu numaraya bağlı doğrulanmış bir hesap yok. E-postanızla şifrenizi yenileyin."));
        return;
      }
      haptic("success");
      setResetPhoneToken(idToken);
      setCode("");
      setPassword1("");
      go("new-password");
      return;
    }
    if (r.taken) {
      haptic("warning");
      setError(t("Bu telefon numarasıyla zaten bir hesap var. Giriş yapın ya da şifrenizi yenileyin."));
      return;
    }
    haptic("success");
    setPhoneToken(idToken);
    setCode("");
    go(codeScreen === "reg-sms" ? "reg-email" : "join-email");
  }

  /** Telefon adımı: aynı numaraya kod zaten gittiyse yeniden gönderilmez, kod ekranına dönülür */
  async function startSms(to: string, codeScreen: SmsScreen) {
    // Numara bu oturumda zaten doğrulandıysa (geri dönülüp tekrar basıldıysa) yeni kod istenmez
    if (codeScreen !== "forgot-sms" && smsTo === to && phoneToken) {
      setError(null);
      go(codeScreen === "reg-sms" ? "reg-email" : "join-email");
      return;
    }
    if (smsTo === to && (codeScreen === "forgot-sms" ? !resetPhoneToken : !phoneToken)) {
      go(codeScreen);
      return;
    }
    if (codeScreen === "forgot-sms") setResetPhoneToken(null);
    else setPhoneToken(null);
    setBusy(true);
    setError(null);
    try {
      await sendSms(to, codeScreen);
    } catch (e) {
      haptic("warning");
      setError(smsErrorText(e));
    } finally {
      setBusy(false);
    }
  }

  /** Kayıt: e-posta da doğrulandı; SMS ile doğrulanan numara hesaba yazılır */
  async function attachPhone(session: Session) {
    if (!phoneToken) return;
    // Bağlantı kopması gibi geçici hatalara karşı 3 kez denenir; yine olmazsa kullanıcıya açıkça söylenir
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await attachVerifiedPhone(session, phoneToken);
        setPhoneSaveFailed(false);
        return;
      } catch (e) {
        if (e instanceof CloudError && e.code === "phone_taken") break;
        await new Promise((r) => window.setTimeout(r, 800 * (attempt + 1)));
      }
    }
    setPhoneSaveFailed(true);
  }

  /**
   * Kayıtta e-postanın uydurma olmadığını kontrol eder (kod göndermeden). Reddedilirse ya da yazım hatası şüphesi varsa
   * true döner ve ekranda sebebi gösterilir. Şüpheli ama geçerli adres, DEVAM'a ikinci kez basılınca kabul edilir.
   */
  async function emailRejected(): Promise<boolean> {
    const address = email.trim();
    const result = await checkEmail(address);
    setEmailSuggestion(result.suggestion ?? null);
    if (!result.ok) {
      haptic("warning");
      setError(
        result.reason === "disposable"
          ? t("Geçici e-posta adresleri kabul edilmiyor. Kendi e-posta adresinizi yazın.")
          : result.reason === "no_mail"
            ? t("Bu e-posta adresinin alan adı mail alamıyor. Adresi kontrol edin.")
            : t("Geçerli bir e-posta adresi yazın."),
      );
      return true;
    }
    if (result.suggestion && emailOddConfirmed !== address) {
      haptic("warning");
      setEmailOddConfirmed(address);
      setInfo(t("Adresiniz doğruysa DEVAM'a tekrar basın."));
      return true;
    }
    return false;
  }

  /** Kayıt ya da katılma: hesap e-postayla açılır ve kod gönderilir. Gerçek şifre kodla doğrulamadan sonra alınır. */
  async function createAccount(next: Screen, afterCode: Screen) {
    const result = await signUp(email.trim(), randomPassword());
    haptic("success");
    if (result === "pending") {
      codeSent(email.trim(), next);
    } else {
      if (next === "reg-code" || next === "join-code") await attachPhone(result);
      setPendingSession(result);
      setPassword1("");
      go(afterCode);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    haptic("light");
    switch (screen) {
      case "login":
        if (!validLogin || !password) return;
        return run(async () => {
          const login = method === "email" ? email.trim() : loginPhone;
          try {
            const session = await signIn(login, password);
            if (loginForJoin) {
              // Mevcut hesapla ekibe katılım: oturum açıldı, işletme adı istenir
              setLoginForJoin(false);
              setPassword1("");
              setPendingSession(session);
              go("join-owner");
              return;
            }
            onSession(session);
          } catch (e) {
            // Kayıt olup kodu girmeden çıkan kişi: yeni kod gönderilir ve kod ekranı açılır
            if (e instanceof CloudError && e.code === "email_not_confirmed" && method === "email") {
              await resendSignupCode(login).catch(() => undefined);
              haptic("warning");
              codeSent(login, "verify");
              return;
            }
            throw e;
          }
        });
      case "verify":
        if (!validCode) return;
        return run(async () => {
          const session = await verifySignupCode(pendingEmail ?? email.trim(), code);
          if (session === "invalid") {
            haptic("warning");
            setError(t("Kod hatalı ya da süresi dolmuş. Yeni kod isteyin."));
            return;
          }
          haptic("success");
          onSession(session);
        });
      case "forgot":
        if (forgotMethod === "phone") {
          if (!forgotPhone) return;
          return startSms(forgotPhone, "forgot-sms");
        }
        if (!validEmail) return;
        return run(async () => {
          await sendResetEmail(email.trim());
          haptic("success");
          codeSent(email.trim(), "reset-code");
        });
      case "reset-code":
        if (!validCode) return;
        return run(async () => {
          const token = await verifyRecoveryCode(pendingEmail ?? email.trim(), code);
          if (token === "invalid") {
            haptic("warning");
            setError(t("Kod hatalı ya da süresi dolmuş. Yeni kod isteyin."));
            return;
          }
          haptic("success");
          setResetToken(token);
          setPassword1("");
          go("new-password");
        });
      case "new-password":
        if (!strongEnough) return;
        return run(async () => {
          if (resetPhoneToken) {
            try {
              await resetPasswordByPhone(resetPhoneToken, password);
            } catch (e) {
              if (e instanceof CloudError && e.code === "no_account") {
                haptic("warning");
                setError(t("Bu numaraya bağlı doğrulanmış bir hesap yok. E-postanızla şifrenizi yenileyin."));
                return;
              }
              throw e;
            }
            setResetPhoneToken(null);
          } else {
            await setPassword(resetToken ?? "", password);
          }
          haptic("success");
          setResetToken(null);
          onRecoveryDone();
          setPassword1("");
          go("login");
          setInfo(t("Şifreniz yenilendi. Yeni şifrenizle giriş yapın."));
        });
      case "reg-business":
        if (business.trim()) go(phoneToken ? "reg-email" : "reg-phone");
        return;
      case "reg-phone":
      case "join-phone":
        if (!regPhone) return;
        return startSms(regPhone, screen === "reg-phone" ? "reg-sms" : "join-sms");
      case "reg-sms":
      case "join-sms":
      case "forgot-sms": {
        if (!validCode) return;
        const codeScreen = screen;
        setBusy(true);
        setError(null);
        try {
          await smsVerified(await confirmSmsCode(code), codeScreen);
        } catch (e) {
          haptic("warning");
          setError(e instanceof CloudError ? describe(e) : smsErrorText(e));
        } finally {
          setBusy(false);
        }
        return;
      }
      case "reg-email":
        if (!validEmail) return;
        return run(async () => {
          if (await emailRejected()) return;
          await createAccount("reg-code", "reg-password");
        });
      case "reg-code":
        if (!validCode) return;
        return run(async () => {
          const session = await verifySignupCode(pendingEmail ?? email.trim(), code, false);
          if (session === "invalid") {
            haptic("warning");
            setError(t("Kod hatalı ya da süresi dolmuş. Yeni kod isteyin."));
            return;
          }
          haptic("success");
          await attachPhone(session);
          setPendingSession(session);
          setCode("");
          go("reg-password");
        });
      case "reg-password":
      case "join-password":
        if (!strongEnough || !pendingSession) return;
        return run(async () => {
          await setPassword(pendingSession.accessToken, password);
          haptic("success");
          setPassword1("");
          go(screen === "reg-password" ? "reg-done" : "join-owner");
        });
      case "reg-done":
        if (pendingSession) {
          saveSession(pendingSession);
          onSession(pendingSession, { isNew: true, businessName: business.trim() });
        }
        return;
      case "join-email":
        if (!validEmail) return;
        return run(async () => {
          if (await emailRejected()) return;
          await createAccount("join-code", "join-password");
        });
      case "join-code":
        if (!validCode) return;
        return run(async () => {
          const session = await verifySignupCode(pendingEmail ?? email.trim(), code, false);
          if (session === "invalid") {
            haptic("warning");
            setError(t("Kod hatalı ya da süresi dolmuş. Yeni kod isteyin."));
            return;
          }
          haptic("success");
          await attachPhone(session);
          setPendingSession(session);
          setCode("");
          go("join-password");
        });
      case "join-owner":
        if (!validOwner || !pendingSession) return;
        return run(async () => {
          const found = await findBusinessByOwnerEmail(pendingSession, ownerId);
          if (found === "expired") throw new CloudError("unknown", "expired");
          if (found.length === 0) {
            haptic("warning");
            setError(t("Bu e-posta ya da telefona ait bir işletme bulunamadı."));
            return;
          }
          await requestJoin(pendingSession, found[0].id);
          haptic("success");
          setBusiness(found[0].name);
          go("join-sent");
        });
      case "join-sent":
        if (pendingSession) {
          saveSession(pendingSession);
          onSession(pendingSession);
        }
        return;
    }
  }

  /** Kodu e-postaya (kayıtta SMS ekranındaysa telefona) yeniden gönderir */
  async function resend() {
    if (resendIn > 0) return;
    if (isSmsScreen(screen)) {
      if (!smsTo || busy) return;
      setBusy(true);
      setError(null);
      try {
        await sendSms(smsTo, screen);
        setInfo(t("Yeni doğrulama kodu gönderildi."));
      } catch (e) {
        haptic("warning");
        setError(smsErrorText(e));
      } finally {
        setBusy(false);
      }
      return;
    }
    if (!pendingEmail) return;
    try {
      await resendSignupCode(pendingEmail);
      setResendIn(RESEND_WAIT);
      setError(null);
      setInfo(t("Yeni doğrulama kodu gönderildi."));
    } catch {
      setError(t("Gönderilemedi; bağlantınızı kontrol edin."));
    }
  }

  // ---------- Açılış ----------

  if (screen === "welcome") {
    return (
      <div className="ob-page ob-welcome">
        <div className="ob-hero">
          <img className="ob-logo" src="/logo.svg" alt="" />
          <h1 className="ob-title">Hesabım Muhasebe</h1>
          <p className="ob-tagline">{t("Cari hesap, kasa ve ekibiniz tek uygulamada")}</p>
          <div className="ob-actions">
            <button type="button" className="ob-btn is-primary" onClick={() => go("login")}>
              {t("Giriş yap")}
            </button>
            <button type="button" className="ob-btn is-light" onClick={() => go("reg-business")}>
              {t("Üye ol")}
            </button>
            <button type="button" className="ob-btn is-outline" onClick={() => go("join-phone")}>
              {t("Ekibe katıl")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------- Ortak parçalar ----------

  const passwordField = (label: string, autoComplete: string) => (
    <div className="field">
      <label htmlFor="auth-password">{label}</label>
      <div className="auth-password">
        <input
          id="auth-password"
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          value={password}
          onChange={(e) => setPassword1(e.target.value)}
        />
        <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? t("Şifreyi gizle") : t("Şifreyi göster")}>
          {show ? t("Gizle") : t("Göster")}
        </button>
      </div>
    </div>
  );

  const emailField = (id: string) => (
    <div className="field">
      <label htmlFor={id}>{t("E-posta")}</label>
      <input
        id={id}
        type="email"
        inputMode="email"
        autoComplete="email"
        autoCapitalize="none"
        autoCorrect="off"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          setEmailSuggestion(null);
        }}
      />
    </div>
  );

  const codeField = (
    <>
      <div className="field">
        <label htmlFor="auth-code">{t("Doğrulama kodu")}</label>
        <input
          id="auth-code"
          className="ob-code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={8}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
        />
      </div>
      <button type="button" className="help-link" disabled={resendIn > 0} onClick={() => void resend()}>
        {resendIn > 0 ? t("Kodu tekrar gönder ({s} sn)", { s: resendIn }) : t("Kodu tekrar gönder")}
      </button>
      {!isSmsScreen(screen) && <p className="field-hint">{t("Mail gelmediyse spam ya da gereksiz klasörüne bakın.")}</p>}
    </>
  );

  // Onay cümlesi parçalar hâlinde çevrilir; Japonca ve Çincede parçalar arasına boşluk konmaz
  const gap = TIGHT.includes(getLanguage()) ? "" : " ";
  const legalEnd = t("metinlerini okuyup kabul etmiş olursunuz.");
  const legal = (
    <p className="field-hint auth-legal">
      {t("Kayıt olarak")}{gap}
      <a href={legalUrl("terms")} target="_blank" rel="noreferrer">{t("Kullanım koşulları")}</a>{gap}
      {t("ve")}{getLanguage() === "ar" ? "" : gap}
      <a href={legalUrl("privacy")} target="_blank" rel="noreferrer">{t("Gizlilik politikası")}</a>
      {/^[\p{L}\p{N}]/u.test(legalEnd) && !ATTACHED_END.includes(getLanguage()) ? " " : ""}
      {legalEnd}{" "}
      <a href={KVKK_URL} target="_blank" rel="noreferrer">{t("KVKK Aydınlatma Metni")}</a>
    </p>
  );

  // ---------- Sihirbaz ve form ekranları ----------

  const flow = REGISTER.includes(screen) ? REGISTER : JOIN.includes(screen) ? JOIN : null;
  const step = flow ? flow.indexOf(screen) + 1 : 0;
  const back = screen === "login" && loginForJoin ? "join-phone" : BACK[screen];

  // Ekran içeriği: başlık, açıklama, alanlar ve alttaki düğme
  let title = "";
  let lead: string | null = null;
  let body: ReactNode = null;
  let action: string | null = t("DEVAM");
  let ready = true;

  switch (screen) {
    case "login":
      title = loginForJoin ? t("Ekibe katılmak için giriş yapın") : t("Giriş yap");
      body = (
        <>
          <div className="sort-options auth-method" role="radiogroup" aria-label={t("Giriş yöntemi")}>
            {(
              [
                ["email", t("E-posta ile")],
                ["phone", t("Telefon ile")],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={method === value}
                className={`sort-btn ${method === value ? "is-active" : ""}`}
                onClick={() => {
                  setMethod(value);
                  setError(null);
                }}
              >
                {label}
              </button>
            ))}
          </div>
          {method === "email" ? (
            emailField("auth-email-login")
          ) : (
            <div className="field">
              <label htmlFor="auth-phone-login">{t("Telefon")}</label>
              <PhoneField id="auth-phone-login" value={loginPhoneInput} onChange={setLoginPhoneInput} />
            </div>
          )}
          {passwordField(t("Şifre"), "current-password")}
          <button
            type="button"
            className="help-link ob-forgot"
            onClick={() => {
              // Şifre yenileme, girişte seçili yöntemle açılır; telefon numarası e-posta kutusuna taşınmaz
              if (method === "phone") setEmail("");
              setForgotMethod(method);
              setForgotPhoneInput("");
              go("forgot");
            }}
          >
            {t("Şifremi unuttum")}
          </button>
        </>
      );
      action = t("GİRİŞ YAP");
      ready = validLogin && password !== "";
      break;
    case "verify":
      title = t("E-postanızı doğrulayın");
      body = codeField;
      action = t("DOĞRULA");
      ready = validCode;
      break;
    case "forgot":
      title = t("Şifremi unuttum");
      lead =
        forgotMethod === "email"
          ? t("Hesabınızın e-posta adresini yazın; size 6 haneli bir kod göndereceğiz.")
          : t("Numaranıza SMS ile 6 haneli bir kod göndereceğiz.");
      body = (
        <>
          <div className="sort-options auth-method" role="radiogroup" aria-label={t("Giriş yöntemi")}>
            {(
              [
                ["email", t("E-posta ile")],
                ["phone", t("Telefon ile")],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={forgotMethod === value}
                className={`sort-btn ${forgotMethod === value ? "is-active" : ""}`}
                onClick={() => {
                  setForgotMethod(value);
                  setError(null);
                  setInfo(null);
                }}
              >
                {label}
              </button>
            ))}
          </div>
          {forgotMethod === "email" ? (
            emailField("auth-email-reset")
          ) : (
            <div className="field">
              <label htmlFor="auth-phone-reset">{t("Telefon")}</label>
              <PhoneField id="auth-phone-reset" value={forgotPhoneInput} onChange={setForgotPhoneInput} />
            </div>
          )}
        </>
      );
      action = t("KOD GÖNDER");
      ready = forgotMethod === "email" ? validEmail : forgotPhone !== "";
      break;
    case "reset-code":
      title = t("Şifrenizi yenileyin");
      body = codeField;
      action = t("DOĞRULA");
      ready = validCode;
      break;
    case "new-password":
      title = t("Yeni şifrenizi belirleyin");
      body = (
        <>
          {passwordField(t("Yeni şifre"), "new-password")}
          <p className="field-hint">{t("En az 6 karakter.")}</p>
        </>
      );
      action = t("ŞİFREYİ YENİLE");
      ready = strongEnough;
      break;
    case "reg-business":
      title = t("İşletmenizin adı");
      lead = t("Ekstrelerde ve ekip ekranlarında bu ad görünür.");
      body = (
        <div className="field">
          <label htmlFor="auth-business">{t("İşletme adı")}</label>
          <input id="auth-business" autoComplete="organization" value={business} onChange={(e) => setBusiness(e.target.value)} />
        </div>
      );
      ready = business.trim() !== "";
      break;
    case "reg-phone":
    case "join-phone":
      title = t("Telefon numaranız");
      lead = t("Numaranızı SMS ile gelecek 6 haneli kodla doğrulayacağız.");
      body = (
        <>
          <div className="field">
            <label htmlFor="auth-phone">{t("Telefon")}</label>
            <PhoneField id="auth-phone" value={phone} onChange={setPhone} />
          </div>
          {screen === "join-phone" && (
            <button
              type="button"
              className="help-link"
              onClick={() => {
                setLoginForJoin(true);
                setPassword1("");
                go("login");
              }}
            >
              {t("Zaten hesabım var: giriş yapıp ekibe katıl")}
            </button>
          )}
        </>
      );
      action = t("KOD GÖNDER");
      ready = regPhone !== "";
      break;
    case "forgot-sms":
      title = t("Şifrenizi yenileyin");
      body = codeField;
      action = t("DOĞRULA");
      ready = validCode;
      break;
    case "reg-sms":
    case "join-sms":
      title = t("Telefonunuzu doğrulayın");
      body = codeField;
      action = t("DOĞRULA");
      ready = validCode;
      break;
    case "reg-email":
    case "join-email":
      title = t("E-posta adresiniz");
      lead = t("Giriş yapmak ve şifrenizi yenilemek için kullanılır.");
      body = (
        <>
          {emailField(screen === "reg-email" ? "auth-email" : "auth-email-join")}
          {emailSuggestion && emailSuggestion !== email.trim() && (
            <button
              type="button"
              className="help-link"
              onClick={() => {
                setEmail(emailSuggestion);
                setEmailSuggestion(null);
                setError(null);
                setInfo(null);
              }}
            >
              {t("Bunu mu demek istediniz: {e}", { e: emailSuggestion })}
            </button>
          )}
        </>
      );
      ready = validEmail;
      break;
    case "reg-password":
    case "join-password":
      title = t("Şifre belirleyin");
      lead = t("E-posta ve şifrenizle giriş yaparsınız.");
      body = (
        <>
          {passwordField(t("Şifre"), "new-password")}
          <p className="field-hint">{t("En az 6 karakter.")}</p>
          {legal}
        </>
      );
      action = screen === "reg-password" ? t("KAYDI TAMAMLA") : t("DEVAM");
      ready = strongEnough;
      break;
    case "reg-code":
    case "join-code":
      title = t("E-postanızı doğrulayın");
      body = codeField;
      action = t("DOĞRULA");
      ready = validCode;
      break;
    case "join-owner":
      title = t("Kimin ekibine katılıyorsunuz?");
      lead = t("İşletme yetkilisinin e-postasını ya da telefon numarasını yazın.");
      body = (
        <div className="field">
          <label htmlFor="auth-owner">{t("Yetkilinin e-postası veya telefonu")}</label>
          <input
            id="auth-owner"
            type="text"
            inputMode="email"
            autoCapitalize="none"
            autoCorrect="off"
            value={owner}
            onChange={(e) => {
              setOwner(e.target.value);
              setError(null);
            }}
          />
        </div>
      );
      action = t("KATILMA İSTEĞİ GÖNDER");
      ready = validOwner;
      break;
    case "reg-done":
      title = t("Hesabınız hazır");
      lead = phoneSaveFailed
        ? t("{b} açıldı. Telefon numaranız kaydedilemedi; Ayarlar → Hesabım bölümünden ekleyebilirsiniz.", { b: business.trim() })
        : t("{b} açıldı. Telefon ve e-posta bilgilerinizi istediğiniz zaman Ayarlar → Hesabım bölümünden düzenleyebilirsiniz.", { b: business.trim() });
      body = <div className="ob-check" aria-hidden="true">✓</div>;
      action = t("BAŞLA");
      break;
    case "join-sent":
      title = t("İsteğiniz gönderildi");
      lead = t("{b} yetkilisi isteğinizi onayladığında işletmeye erişiminiz açılır.", { b: business });
      body = <div className="ob-check is-wait" aria-hidden="true">⏳</div>;
      action = t("TAMAM");
      break;
  }

  const done = screen === "reg-done" || screen === "join-sent";

  return (
    <div className="ob-page" style={{ paddingBottom: keyboard }}>
      <form className={`ob-sheet ${done ? "is-done" : ""}`} onSubmit={submit} noValidate>
        <div className="ob-top">
          {back ? (
            <button type="button" className="round-btn" aria-label={t("Geri")} onClick={() => go(back)}>
              <Svg d="M15 5l-7 7 7 7" />
            </button>
          ) : (
            <span className="ob-top-space" />
          )}
          {flow && (
            <>
              <div className="ob-progress" aria-hidden="true">
                <i style={{ width: `${(step / flow.length) * 100}%` }} />
              </div>
              <span className="ob-step">
                {step}/{flow.length}
              </span>
            </>
          )}
        </div>
        {/* Geri düğmesi üstte sabit; içerik altında ortalanır (klavye açılınca kesilmez, kaydırılır) */}
        <div className="ob-body">
          {done && body}
          <h2 className="ob-heading">{title}</h2>
          {lead && <p className="ob-lead">{lead}</p>}
          {info && <p className="form-success" role="status">{info}</p>}
          {!done && body}
          {error && <p className="form-error" role="alert">{error}</p>}
          {action && (
            <button className="primary-btn" type="submit" disabled={busy || !ready}>
              {busy ? t("Bekleyin…") : action}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
