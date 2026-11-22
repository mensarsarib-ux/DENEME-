import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Capacitor } from "@capacitor/core";
import { Keyboard } from "@capacitor/keyboard";
import {
  attachVerifiedPhone,
  checkVerifiedPhone,
  CloudError,
  findBusinessByOwnerEmail,
  getAccountProfile,
  normalizePhone,
  resetPasswordByPhone,
  requestJoin,
  resendSignupCode,
  saveSession,
  sendResetEmail,
  setPassword,
  signIn,
  smsSession,
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

/**
 * Açılış ve hesap ekranları. Açılışta logo, ardından Giriş yap / Üye ol / Ekibe katıl.
 * Giriş, üye olma ve ekibe katılma telefon numarası ve SMS koduyla yapılır; e-posta ve şifre istenmez.
 * Telefonu kayıtlı olmayan eski hesaplar "E-posta ile giriş" ile e-posta ve şifreyle girer, ardından bir kez
 * telefonlarını SMS ile ekler (sonraki girişlerde SMS kodu yeterli). Şifremi unuttum yalnızca e-postalı girişte.
 */
type Screen =
  | "welcome"
  | "login"
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
  | "reg-phone"
  | "reg-sms"
  | "join-phone"
  | "join-sms"
  | "join-owner"
  | "join-sent";

/** Sihirbaz adımları (ilerleme çizgisi için) */
const REGISTER: Screen[] = ["reg-business", "reg-phone", "reg-sms"];
const JOIN: Screen[] = ["join-phone", "join-sms", "join-owner"];

/** SMS kodu ekranları ve hangi amaçla kullanıldıkları */
const SMS_SCREENS = ["reg-sms", "join-sms", "forgot-sms", "login-sms", "add-sms"] as const;
type SmsScreen = (typeof SMS_SCREENS)[number];
const isSmsScreen = (s: Screen): s is SmsScreen => (SMS_SCREENS as readonly string[]).includes(s);

/** Geri düğmesinin götürdüğü ekran; yoksa geri düğmesi gösterilmez */
const BACK: Partial<Record<Screen, Screen>> = {
  login: "welcome",
  "login-sms": "login",
  "login-email": "login",
  "add-sms": "add-phone",
  verify: "login-email",
  forgot: "login-email",
  "reset-code": "forgot",
  "forgot-sms": "forgot",
  "reg-business": "welcome",
  "reg-phone": "reg-business",
  // SMS kodu ekranından numaraya dönülür: yanlış yazılan numara düzeltilir
  "reg-sms": "reg-phone",
  "join-phone": "welcome",
  "join-sms": "join-phone",
  "join-owner": "welcome",
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
}: {
  /** E-postadaki şifre sıfırlama bağlantısından gelindiyse geçici belirteç */
  recoveryToken?: string | null;
  /** Giriş başarılı olunca; yeni kayıtta isNew ve işletme adı da gelir */
  onSession: (session: Session, info?: { isNew: boolean; businessName: string }) => void;
  onRecoveryDone: () => void;
}) {
  const [screen, setScreen] = useState<Screen>(recoveryToken ? "new-password" : "welcome");
  const [business, setBusiness] = useState("");
  const [email, setEmail] = useState("");
  // Girişte telefon kutusu ayrı tutulur: e-posta ve telefon birbirinin kutusuna ya da şifre yenilemeye geçmez
  const [loginPhoneInput, setLoginPhoneInput] = useState("");
  const [password, setPassword1] = useState("");
  const [show, setShow] = useState(false);
  const [code, setCode] = useState("");
  const [owner, setOwner] = useState("");
  // Kayıt, ekibe katılma ve telefon ekleme: telefon numarası ve SMS'in gönderildiği numara
  const [phone, setPhone] = useState("");
  const [smsTo, setSmsTo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  // Kodun gönderildiği e-posta; ekibe katılmada ve telefon eklemede açılmış oturum (adımlar bitince kaydedilir)
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

  const validOwner = ownerId.includes("@") ? /^\S+@\S+\.\S+$/.test(ownerId) : ownerId !== "";
  const validCode = /^\d{6,8}$/.test(code);
  const regPhone = normalizePhone(phone) ?? "";
  const forgotPhone = normalizePhone(forgotPhoneInput) ?? "";
  const strongEnough = password.length >= 6;

  function go(next: Screen) {
    haptic("light");
    setScreen(next);
    setError(null);
    setInfo(null);
  }

  function describe(e: unknown): string {
    const reason = e instanceof CloudError ? e.code : "unknown";
    switch (reason) {
      case "invalid_credentials": return t("Bilgiler veya şifre hatalı.");
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
    setInfo(t("{p} numarasına SMS ile 6 haneli bir kod gönderdik.", { p: to }));
  }

  /** Oturum cihaza yazılır ve uygulama açılır */
  function enter(session: Session, info?: { isNew: boolean; businessName: string }) {
    saveSession(session);
    onSession(session, info);
  }

  /**
   * SMS kodu doğrulandı. Giriş: numaranın hesabına oturum açılır (hesap yoksa söylenir). Üye ol ve ekibe katıl:
   * numaranın hesabı yoksa açılır, varsa ona girilir. Telefon ekleme: numara e-postayla girilen hesaba yazılır.
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
    const { session, isNew } = await smsSession(idToken, codeScreen !== "login-sms");
    haptic("success");
    setCode("");
    if (codeScreen === "join-sms") {
      setPendingSession(session);
      go("join-owner");
      return;
    }
    // Üye ol: numara zaten kayıtlıysa o hesaba girilir (ikinci hesap açılmaz)
    enter(session, codeScreen === "reg-sms" && isNew ? { isNew: true, businessName: business.trim() } : undefined);
  }

  /** Telefon adımı: aynı numaraya kod az önce gittiyse yeniden gönderilmez, kod ekranına dönülür */
  async function startSms(to: string, codeScreen: SmsScreen) {
    if (smsTo === to && resendIn > 0) {
      go(codeScreen);
      return;
    }
    if (codeScreen === "forgot-sms") setResetPhoneToken(null);
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

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    haptic("light");
    switch (screen) {
      case "login":
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
      case "reg-business":
        if (business.trim()) go("reg-phone");
        return;
      case "reg-phone":
      case "join-phone":
        if (!regPhone) return;
        return startSms(regPhone, screen === "reg-phone" ? "reg-sms" : "join-sms");
      case "reg-sms":
      case "join-sms":
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
        if (pendingSession) enter(pendingSession);
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
    } catch (e) {
      setError(
        e instanceof CloudError && (e.code === "code_recently_sent" || e.code === "email_busy")
          ? describe(e)
          : t("Gönderilemedi; bağlantınızı kontrol edin."),
      );
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

  const flow = REGISTER.includes(screen) ? REGISTER : JOIN.includes(screen) ? JOIN : null;
  const step = flow ? flow.indexOf(screen) + 1 : 0;
  const back = BACK[screen];

  // Ekran içeriği: başlık, açıklama, alanlar ve alttaki düğme
  let title = "";
  let lead: string | null = null;
  let body: ReactNode = null;
  let action: string | null = t("DEVAM");
  let ready = true;

  switch (screen) {
    case "login":
      title = t("Giriş yap");
      lead = t("Telefon numaranıza SMS ile 6 haneli bir kod göndereceğiz.");
      body = (
        <>
          <div className="field">
            <label htmlFor="auth-phone-login">{t("Telefon")}</label>
            <PhoneField id="auth-phone-login" value={loginPhoneInput} onChange={setLoginPhoneInput} />
          </div>
          {/* Telefonu kayıtlı olmayan eski hesaplar */}
          <button
            type="button"
            className="help-link"
            onClick={() => {
              setPassword1("");
              go("login-email");
            }}
          >
            {t("E-posta ile giriş yap")}
          </button>
        </>
      );
      action = t("KOD GÖNDER");
      ready = loginPhone !== "";
      break;
    case "login-email":
      title = t("E-posta ile giriş");
      body = (
        <>
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
        </>
      );
      action = t("GİRİŞ YAP");
      ready = validEmail && password !== "";
      break;
    case "add-phone":
      title = t("Telefonunuzu ekleyin");
      lead = t("Bundan sonra şifre yerine telefonunuza gelen SMS koduyla giriş yaparsınız.");
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
      body = codeField;
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
          {/* Hesap SMS koduyla açılır; kayıt onayı bu adımda verilir */}
          {legal}
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
    case "join-sent":
      title = t("İsteğiniz gönderildi");
      lead = t("{b} yetkilisi isteğinizi onayladığında işletmeye erişiminiz açılır.", { b: business });
      body = <div className="ob-check is-wait" aria-hidden="true">⏳</div>;
      action = t("TAMAM");
      break;
  }

  const done = screen === "join-sent";

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
