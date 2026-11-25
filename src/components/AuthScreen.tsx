import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Capacitor } from "@capacitor/core";
import { Keyboard } from "@capacitor/keyboard";
import {
  attachVerifiedPhone,
  checkVerifiedPhone,
  CloudError,
  getAccountProfile,
  normalizePhone,
  resetPasswordByPhone,
  resendSignupCode,
  saveSession,
  sendResetEmail,
  setPassword,
  signIn,
  signUp,
  smsSession,
  verifyRecoveryCode,
  verifySignupCode,
  acceptInvite,
  myInvites,
  type Session,
  type TeamInvite,
} from "../lib/cloud";
import { haptic } from "../lib/haptics";
import { getLanguage, t } from "../lib/i18n";
import { legalBase } from "../lib/platform";
import { confirmSmsCode, hasPendingCode, resendWait, sendSmsCode, smsErrorText } from "../lib/phoneVerify";
import { Svg } from "./Icon";
import PhoneField from "./PhoneField";

/**
 * Hesap ekranları. Tanıtımdan sonra telefon numarası ve SMS kodu: numara kayıtlıysa hesaba girilir, değilse işletme
 * adı sorulup hesap açılır. Numaraya ekip daveti geldiyse önce "Katıl / Kendi işletmemi aç" sorulur.
 * E-posta ve şifre istenmez.
 * Telefonu kayıtlı olmayan eski hesaplar "E-posta ile giriş" ile e-posta ve şifreyle girer, ardından bir kez
 * telefonlarını SMS ile ekler (sonraki girişlerde SMS kodu yeterli). Şifremi unuttum yalnızca e-postalı girişte.
 */
type Screen =
  | "login"
  | "signin-phone"
  | "biz-first"
  | "reg-email"
  | "login-sms"
  | "login-email"
  | "add-phone"
  | "add-sms"
  | "verify"
  | "forgot"
  | "forgot-sms"
  | "reset-code"
  | "new-password"
  | "reg-business"
  | "invite";

/** Sihirbaz adımları (ilerleme çizgisi için) */
/** Yeni kullanıcı: işletme adı → (uygulamayı rehberle dener) → telefon → SMS kodu */
const REGISTER: Screen[] = ["biz-first", "login", "login-sms"];

/** SMS kodu ekranları ve hangi amaçla kullanıldıkları */
const SMS_SCREENS = ["forgot-sms", "login-sms", "add-sms"] as const;
type SmsScreen = (typeof SMS_SCREENS)[number];
const isSmsScreen = (s: Screen): s is SmsScreen => (SMS_SCREENS as readonly string[]).includes(s);

/** Geri düğmesinin götürdüğü ekran; yoksa geri düğmesi gösterilmez */
const BACK: Partial<Record<Screen, Screen>> = {
  "login-sms": "login",
  "reg-business": "login",
  invite: "login",
  "login-email": "login",
  "signin-phone": "login",
  "reg-email": "login",
  "add-sms": "add-phone",
  verify: "login-email",
  forgot: "login-email",
  "reset-code": "forgot",
  "forgot-sms": "forgot",
  "new-password": "login-email",
};

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
  mode = "start",
  start,
  trialBusiness,
  onTrial,
}: {
  /**
   * start: tanıtımdan sonra işletme adı sorulur (sağ üstte Giriş yap); ad yazılınca uygulama hesapsız denenir.
   * verify: deneme bitti (ilk müşteri rehberi); kayıtlar kaybolmasın diye telefon doğrulanıp hesap açılır.
   */
  mode?: "start" | "verify";
  /** Açılış ekranı (tanıtımdaki "Giriş yap" bağlantısıyla gelindiyse giriş ekranı) */
  start?: Screen;
  /** Denemede yazılan işletme adı: hesap bu adla açılır, telefondaki kayıtlar hesaba taşınır */
  trialBusiness?: string;
  /** İşletme adı yazıldı: uygulama hesapsız açılır, ilk müşteri rehberi başlar */
  onTrial?: (businessName: string) => void;
  /** E-postadaki şifre sıfırlama bağlantısından gelindiyse geçici belirteç */
  recoveryToken?: string | null;
  /** Giriş başarılı olunca; yeni kayıtta isNew ve işletme adı da gelir */
  onSession: (session: Session, info?: { isNew: boolean; businessName: string }) => void;
  onRecoveryDone: () => void;
}) {
  const [screen, setScreen] = useState<Screen>(
    recoveryToken ? "new-password" : (start ?? (mode === "verify" ? "login" : "biz-first")),
  );
  // Kayıt adımlarının başı: denemeden önce işletme adı, denemeden sonra telefon
  const home: Screen = mode === "verify" ? "login" : "biz-first";
  const [business, setBusiness] = useState("");
  const [email, setEmail] = useState("");
  // Girişte telefon kutusu ayrı tutulur: e-posta ve telefon birbirinin kutusuna ya da şifre yenilemeye geçmez
  const [loginPhoneInput, setLoginPhoneInput] = useState("");
  const [password, setPassword1] = useState("");
  const [show, setShow] = useState(false);
  const [code, setCode] = useState("");
  // Telefon ekleme (eski hesap): telefon numarası; SMS'in gönderildiği numara
  const [phone, setPhone] = useState("");
  const [smsTo, setSmsTo] = useState<string | null>(null);
  // Kayıtlı olmayan numara doğrulandı: hesap, işletme adı (ya da davete katılma) seçilince bu belirteçle açılır
  const [phoneToken, setPhoneToken] = useState<string | null>(null);
  // Numaraya gelmiş ekip davetleri
  const [invites, setInvites] = useState<TeamInvite[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  // Kodun gönderildiği e-posta; davet ve telefon eklemede açılmış oturum (adımlar bitince kaydedilir)
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [pendingSession, setPendingSession] = useState<Session | null>(null);
  // SMS gönderilemeyen numaralar (kaç kez): Firebase bazı numaralara hiç kod göndermiyor (hata 39). Aynı numarada
  // art arda denemek cihazı geçici engelletir; ikinci hatadan sonra yeniden denenmez, e-postayla devam önerilir.
  const [smsFails, setSmsFails] = useState<Record<string, number>>({});
  // E-postayla kayıt (SMS gelmeyince): kod ekranından geri e-posta ekranına dönülür
  const [emailSignup, setEmailSignup] = useState(false);
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
  // Kayıtlı kullanıcı "Giriş yap"tan mı geldi (kayıt adımları ve ilerleme çizgisi gösterilmez)
  const [signingIn, setSigningIn] = useState(start === "signin-phone" || start === "login-email");

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

  // Klavye açılınca (ya da ekran değişince) gönder/kaydet düğmesi klavyenin hemen üstüne kaydırılır
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (keyboard <= 0) return;
    const timer = window.setTimeout(() => {
      formRef.current?.querySelector<HTMLElement>('button[type="submit"]')?.scrollIntoView({ block: "end", behavior: "smooth" });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [keyboard, screen]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = window.setTimeout(() => setResendIn((n) => n - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [resendIn]);

  // Girişte kimlik: e-posta ya da telefon (+90… biçiminde)
  const validEmail = /^\S+@\S+\.\S+$/.test(email.trim());
  const loginPhone = normalizePhone(loginPhoneInput) ?? "";

  const validCode = /^\d{6,8}$/.test(code);
  const regPhone = normalizePhone(phone) ?? "";
  const forgotPhone = normalizePhone(forgotPhoneInput) ?? "";
  const strongEnough = password.length >= 6;

  function go(next: Screen) {
    haptic("light");
    // Giriş yap ekranlarından gelindiyse SMS kodu ekranının geri düğmesi oraya döner
    if (next === "login" || next === "biz-first") setSigningIn(false);
    if (next === "signin-phone" || next === "login-email") setSigningIn(true);
    setScreen(next);
    setError(null);
    setInfo(null);
  }

  function describe(e: unknown): string {
    const reason = e instanceof CloudError ? e.code : "unknown";
    switch (reason) {
      case "invalid_credentials": return t("Bilgiler veya şifre hatalı.");
      case "invalid_sms_code": return t("Kod hatalı ya da süresi dolmuş. Yeni kod isteyin.");
      case "no_account": return t("Bu numarayla kayıtlı hesap yok. Üye olun ya da e-posta ile giriş yapın.");
      case "email_taken": return t("Bu e-posta ile zaten bir hesap var; giriş yapın.");
      case "phone_taken": return t("Bu telefon numarası başka bir hesapta kullanılıyor.");
      case "too_many_attempts": return t("Çok fazla hatalı deneme yapıldı. 15 dakika sonra tekrar deneyin.");
      case "weak_password": return t("Şifre en az 6 karakter olmalı.");
      case "email_not_confirmed": return t("E-postanız henüz doğrulanmadı. E-postanıza gelen 6 haneli kodu girin.");
      case "network": return t("Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edin.");
      case "code_recently_sent": return t("Kod az önce gönderildi. Biraz bekleyip tekrar deneyin.");
      case "email_busy": return t("Şu anda çok fazla istek var. Birkaç dakika sonra tekrar deneyin.");
      case "invalid_email": return t("Geçerli bir e-posta adresi yazın.");
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

  /** Numaraya SMS kodu gönderir ve verilen kod ekranını açar */
  async function sendSms(to: string, codeScreen: SmsScreen) {
    // Android SMS'i kendisi okuyup doğrularsa: hata olursa ekranda gösterilir (kod elle de girilebilir)
    await sendSmsCode(to, (idToken) =>
      void smsVerified(idToken, codeScreen).catch((e: unknown) => {
        haptic("warning");
        setError(describe(e));
      }),
    );
    haptic("success");
    setSmsTo(to);
    setCode("");
    setResendIn(await resendWait(to));
    if (screen !== codeScreen) go(codeScreen);
    setInfo(t("{p} numarasına WhatsApp ile 6 haneli bir kod gönderdik.", { p: to }));
  }

  /** Oturum cihaza yazılır ve uygulama açılır */
  function enter(session: Session, info?: { isNew: boolean; businessName: string }) {
    saveSession(session);
    onSession(session, info);
  }

  /**
   * SMS kodu doğrulandı. Giriş: numara kayıtlıysa hesaba girilir (numaraya gelmiş davet varsa önce sorulur);
   * kayıtlı değilse davet ya da işletme adı ekranı açılır. Telefon ekleme: numara e-postayla girilen hesaba yazılır.
   * Şifre yenileme: numara doğrulanmış bir hesaba ait olmalıdır.
   */
  async function smsVerified(idToken: string, codeScreen: SmsScreen) {
    if (codeScreen === "forgot-sms") {
      const r = await checkVerifiedPhone(idToken);
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
    if (codeScreen === "add-sms") {
      if (!pendingSession) return;
      const r = await attachVerifiedPhone(pendingSession, idToken);
      if (r === "expired") throw new CloudError("unknown", "expired");
      haptic("success");
      enter(pendingSession);
      return;
    }
    const result = await smsSession(idToken, false);
    haptic("success");
    setCode("");
    if ("noAccount" in result) {
      const fromTrial = mode === "verify" && !signingIn;
      // Ekip daveti varsa (çalışan "Giriş yap"tan numarasıyla gelir) davet ekranı açılır
      if (result.invites.length > 0) {
        setSigningIn(false);
        setPhoneToken(idToken);
        setPendingSession(null);
        setInvites(result.invites);
        go("invite");
        return;
      }
      // Giriş yap: numara kayıtlı değilse yeni hesap açılmaz. Kişi e-postayla kayıt olmuş olabilir;
      // numarasını girince ikinci (boş) bir hesap açılmasın, e-postayla girmesi söylenir.
      if (signingIn) {
        setCode("");
        go("signin-phone");
        setError(t("Bu numaraya kayıtlı bir hesap yok. E-postanızla kayıt olduysanız E-posta sekmesinden giriş yapın."));
        return;
      }
      setPhoneToken(idToken);
      setPendingSession(null);
      setInvites(result.invites);
      // Denemeden gelen yeni kullanıcı: işletme adı zaten yazıldı, hesap hemen açılır ve kayıtları taşınır
      if (fromTrial) {
        await openTrialAccount(idToken);
        return;
      }
      go("reg-business");
      return;
    }
    // Kayıtlı hesap: numaraya bekleyen ekip daveti varsa sorulur
    const waiting = await myInvites(result.session).catch(() => [] as TeamInvite[]);
    if (waiting !== "expired" && waiting.length > 0) {
      setPendingSession(result.session);
      setInvites(waiting);
      go("invite");
      return;
    }
    enter(result.session);
  }

  /** Denemeden sonra hesap açılır: işletme adı denemede yazıldı, telefondaki kayıtlar hesaba yazılır */
  async function openTrialAccount(idToken: string) {
    const created = await smsSession(idToken, true);
    if ("noAccount" in created) throw new CloudError("unknown", "no account");
    haptic("success");
    enter(created.session, { isNew: true, businessName: trialBusiness ?? "" });
  }

  /** Kayıtlı olmayan numarayla hesap açılır (SMS doğrulamasının belirteciyle) */
  async function createWithPhone(): Promise<Session> {
    if (!phoneToken) throw new CloudError("unknown", "no token");
    const result = await smsSession(phoneToken, true);
    if ("noAccount" in result) throw new CloudError("unknown", "no account");
    return result.session;
  }

  /** Telefon adımı: aynı numaraya kod az önce gittiyse yeniden gönderilmez, kod ekranına dönülür */
  async function startSms(to: string, codeScreen: SmsScreen) {
    if (smsTo === to && resendIn > 0) {
      go(codeScreen);
      return;
    }
    // Bu numaraya az önce kod gitti (uygulama kapatılıp açılmış olabilir): beklemek yerine gelen kod girilir
    if (hasPendingCode(to)) {
      setSmsTo(to);
      setCode("");
      setResendIn(await resendWait(to));
      go(codeScreen);
      setInfo(t("{p} numarasına az önce kod gönderdik. WhatsApp'taki 6 haneli kodu girin.", { p: to }));
      return;
    }
    if (codeScreen === "forgot-sms") setResetPhoneToken(null);
    if ((smsFails[to] ?? 0) >= 2) {
      haptic("warning");
      setError(t("Bu numaraya şu an kod gönderilemiyor. Birkaç dakika sonra tekrar deneyin."));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await sendSms(to, codeScreen);
    } catch (e) {
      haptic("warning");
      setSmsFails((m) => ({ ...m, [to]: (m[to] ?? 0) + 1 }));
      setError(smsErrorText(e));
    } finally {
      setBusy(false);
    }
  }

  /** Davete katıl: hesap yoksa numarayla açılır, sonra yetkilinin işletmesine üye olunur */
  function joinInvite(id: string) {
    return run(async () => {
      const session = pendingSession ?? (await createWithPhone());
      try {
        const r = await acceptInvite(session, id);
        if (r === "expired") throw new CloudError("unknown", "expired");
      } catch (e) {
        if (e instanceof CloudError && e.code === "team_limit") {
          haptic("warning");
          setPendingSession(session);
          setError(t("Bu işletmenin ekibi dolu. Yetkilinin paketini yükseltmesi gerekiyor."));
          return;
        }
        throw e;
      }
      haptic("success");
      enter(session, pendingSession ? undefined : { isNew: true, businessName: "" });
    });
  }

  /** Daveti geç: kayıtlı hesap uygulamaya girer, yeni numara işletme adını yazar */
  function ownBusiness() {
    if (pendingSession) enter(pendingSession);
    else if (mode === "verify" && phoneToken) {
      const token = phoneToken;
      void run(() => openTrialAccount(token));
    } else go("reg-business");
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    haptic("light");
    switch (screen) {
      case "login":
      case "signin-phone":
        if (!loginPhone) return;
        return startSms(loginPhone, "login-sms");
      case "login-email":
        if (!validEmail || !password) return;
        return run(async () => {
          const login = email.trim();
          let session: Session;
          try {
            session = await signIn(login, password);
          } catch (e) {
            // Kayıt olup kodu girmeden çıkan kişi: yeni kod gönderilir ve kod ekranı açılır
            if (e instanceof CloudError && e.code === "email_not_confirmed") {
              await resendSignupCode(login).catch(() => undefined);
              haptic("warning");
              codeSent(login, "verify");
              return;
            }
            throw e;
          }
          setPassword1("");
          // Telefonu doğrulanmamış eski hesap: bir kez telefon eklenir, sonraki girişler SMS koduyla olur
          const profile = await getAccountProfile(session).catch(() => null);
          if (profile && profile !== "expired" && !profile.phoneVerified) {
            setPendingSession(session);
            setPhone("");
            go("add-phone");
            return;
          }
          onSession(session);
        });
      case "add-phone":
        if (!regPhone) return;
        return startSms(regPhone, "add-sms");
      case "reg-email":
        if (!validEmail || password.length < 6) return;
        return run(async () => {
          const address = email.trim();
          const created = await signUp(address, password, { name: trialBusiness ?? "" });
          if (created !== "pending") {
            saveSession(created);
            haptic("success");
            onSession(created);
            return;
          }
          setEmailSignup(true);
          codeSent(address, "verify");
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
          go("login-email");
          setInfo(t("Şifreniz yenilendi. Yeni şifrenizle giriş yapın."));
        });
      case "biz-first":
        if (!business.trim()) return;
        haptic("success");
        onTrial?.(business.trim());
        return;
      case "reg-business":
        if (!business.trim()) return;
        return run(async () => {
          const session = await createWithPhone();
          haptic("success");
          enter(session, { isNew: true, businessName: business.trim() });
        });
      case "login-sms":
      case "add-sms":
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
    } catch (e) {
      setError(
        e instanceof CloudError && (e.code === "code_recently_sent" || e.code === "email_busy")
          ? describe(e)
          : t("Gönderilemedi; bağlantınızı kontrol edin."),
      );
    }
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
        onChange={(e) => setEmail(e.target.value)}
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

  const flow = REGISTER.includes(screen) && !(signingIn && screen === "login-sms") ? REGISTER : null;
  const step = flow ? flow.indexOf(screen) + 1 : 0;
  const back =
    emailSignup && screen === "verify"
      ? "reg-email"
      : signingIn && screen === "login-sms"
      ? "signin-phone"
      : screen === "signin-phone" || screen === "login-email"
        ? home
        : screen === "login" && mode === "start"
          ? undefined
          : BACK[screen];

  // Giriş yap: telefon ve e-posta sekmeleri, altta üye olma bağlantısı
  const signinTabs = (
    <div className="auth-tabs" role="tablist">
      <button
        type="button"
        role="tab"
        aria-selected={screen === "signin-phone"}
        className={screen === "signin-phone" ? "is-active" : ""}
        onClick={() => screen !== "signin-phone" && go("signin-phone")}
      >
        {t("Telefon")}
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={screen === "login-email"}
        className={screen === "login-email" ? "is-active" : ""}
        onClick={() => {
          if (screen === "login-email") return;
          setPassword1("");
          go("login-email");
        }}
      >
        {t("E-posta")}
      </button>
    </div>
  );
  const toRegister = (
    <button type="button" className="help-link" onClick={() => go(home)}>
      {t("Hesabınız yok mu? Üye olun")}
    </button>
  );

  // Ekran içeriği: başlık, açıklama, alanlar ve alttaki düğme
  let title = "";
  let lead: string | null = null;
  let body: ReactNode = null;
  let action: string | null = t("DEVAM");
  let ready = true;

  switch (screen) {
    case "login":
      title = mode === "verify" ? t("Kayıtlarınızı kaybetmeyin") : t("Hesabınızı oluşturun");
      lead =
        mode === "verify"
          ? t("Hesabınızı telefon numaranızla açalım; kayıtlarınız güvenle saklansın ve her cihazda açılsın. WhatsApp ile 6 haneli bir kod göndereceğiz.")
          : t("Telefon numaranıza WhatsApp ile 6 haneli bir kod göndereceğiz.");
      body = (
        <>
          <div className="field">
            <label htmlFor="auth-phone-login">{t("Telefon")}</label>
            <PhoneField id="auth-phone-login" value={loginPhoneInput} onChange={setLoginPhoneInput} />
          </div>
          {legal}
        </>
      );
      action = t("KOD GÖNDER");
      ready = loginPhone !== "";
      break;
    case "signin-phone":
      title = t("Giriş yap");
      lead = t("Kayıtlı telefon numaranıza WhatsApp ile 6 haneli bir kod göndereceğiz.");
      body = (
        <>
          {signinTabs}
          <div className="field">
            <label htmlFor="auth-phone-signin">{t("Telefon")}</label>
            <PhoneField id="auth-phone-signin" value={loginPhoneInput} onChange={setLoginPhoneInput} />
          </div>
          {toRegister}
        </>
      );
      action = t("KOD GÖNDER");
      ready = loginPhone !== "";
      break;
    case "login-email":
      title = t("Giriş yap");
      body = (
        <>
          {signinTabs}
          {emailField("auth-email-login")}
          {passwordField(t("Şifre"), "current-password")}
          <button
            type="button"
            className="help-link ob-forgot"
            onClick={() => {
              setForgotMethod("email");
              setForgotPhoneInput("");
              go("forgot");
            }}
          >
            {t("Şifremi unuttum")}
          </button>
          {toRegister}
        </>
      );
      action = t("GİRİŞ YAP");
      ready = validEmail && password !== "";
      break;
    case "add-phone":
      title = t("Telefonunuzu ekleyin");
      lead = t("Bundan sonra şifre yerine WhatsApp'a gelen kodla giriş yaparsınız.");
      body = (
        <>
          <div className="field">
            <label htmlFor="auth-phone-add">{t("Telefon")}</label>
            <PhoneField id="auth-phone-add" value={phone} onChange={setPhone} />
          </div>
          <button type="button" className="help-link" onClick={() => pendingSession && onSession(pendingSession)}>
            {t("Daha sonra")}
          </button>
        </>
      );
      action = t("KOD GÖNDER");
      ready = regPhone !== "";
      break;
    case "login-sms":
    case "add-sms":
      title = t("Telefonunuzu doğrulayın");
      body = (
        <>
          {codeField}
        </>
      );
      action = t("DOĞRULA");
      ready = validCode;
      break;
    case "verify":
      title = t("E-postanızı doğrulayın");
      body = codeField;
      action = t("DOĞRULA");
      ready = validCode;
      break;
    case "forgot":
      title = t("Şifremi unuttum");
      lead = t("Hesabınızın e-posta adresini yazın; size 6 haneli bir kod göndereceğiz.");
      body = (
        <>
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
    case "reg-email":
      title = t("E-posta ile devam edin");
      lead = t("Hesabınızı e-posta adresinizle açalım. Girdiğiniz kayıtlar hesabınıza taşınır.");
      body = (
        <>
          {emailField("auth-email-reg")}
          {passwordField(t("Şifre (en az 6 karakter)"), "new-password")}
          {legal}
        </>
      );
      action = t("HESAP AÇ");
      ready = validEmail && password.length >= 6;
      break;
    case "biz-first":
      title = t("İşletmenizin adı");
      lead = t("Ekstrelerde ve ekip ekranlarında bu ad görünür.");
      body = (
        <div className="field">
          <label htmlFor="auth-business-first">{t("İşletme adı")}</label>
          <input
            id="auth-business-first"
            autoComplete="organization"
            value={business}
            onChange={(e) => setBusiness(e.target.value)}
          />
        </div>
      );
      ready = business.trim() !== "";
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
    case "forgot-sms":
      title = t("Şifrenizi yenileyin");
      body = codeField;
      action = t("DOĞRULA");
      ready = validCode;
      break;
    case "invite":
      title = invites.length === 1
        ? t("{b} sizi ekibine davet etti", { b: invites[0].businessName })
        : t("Ekip davetleriniz var");
      lead = t("Katılırsanız işletmenin kayıtlarını ekip üyesi olarak görürsünüz.");
      body = (
        <>
          {invites.map((inv) => (
            <button key={inv.id} type="button" className="primary-btn" disabled={busy} onClick={() => void joinInvite(inv.id)}>
              {invites.length === 1 ? t("Katıl") : t("{b} ekibine katıl", { b: inv.businessName })}
            </button>
          ))}
          <button type="button" className="help-link" disabled={busy} onClick={ownBusiness}>
            {t("Kendi işletmemi aç")}
          </button>
        </>
      );
      action = null;
      break;
  }

  const done = false;

  return (
    <div className="ob-page" style={{ paddingBottom: keyboard }}>
      <form ref={formRef} className={`ob-sheet ${done ? "is-done" : ""}`} onSubmit={submit} noValidate>
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
          {screen === "biz-first" && (
            <button type="button" className="ob-signin-btn" onClick={() => go("signin-phone")}>
              {t("Giriş yap")}
            </button>
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
