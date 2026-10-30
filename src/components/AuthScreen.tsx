import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Capacitor } from "@capacitor/core";
import { Keyboard } from "@capacitor/keyboard";
import {
  CloudError,
  findBusinessByOwnerEmail,
  normalizePhone,
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
import { Svg } from "./Icon";
import PhoneField from "./PhoneField";

/**
 * Açılış ve hesap ekranları. Açılışta logo, ardından Giriş yap / Üye ol / Ekibe katıl.
 * Üye ol ve Ekibe katıl her adımda tek soru soran sihirbazlardır. Doğrulama e-postayla yapılır;
 * telefon isteğe bağlıdır ve SMS gerektirmez: girişte telefon numarası ve şifreyle de girilebilir.
 */
type Screen =
  | "welcome"
  | "login"
  | "verify"
  | "forgot"
  | "reset-code"
  | "new-password"
  | "reg-business"
  | "reg-name"
  | "reg-email"
  | "reg-phone"
  | "reg-password"
  | "reg-code"
  | "reg-done"
  | "join-name"
  | "join-email"
  | "join-phone"
  | "join-password"
  | "join-code"
  | "join-owner"
  | "join-sent";

/** Sihirbaz adımları (ilerleme çizgisi için) */
const REGISTER: Screen[] = ["reg-business", "reg-name", "reg-email", "reg-phone", "reg-password", "reg-code"];
const JOIN: Screen[] = ["join-name", "join-email", "join-phone", "join-password", "join-code", "join-owner"];

/** Geri düğmesinin götürdüğü ekran; yoksa geri düğmesi gösterilmez */
const BACK: Partial<Record<Screen, Screen>> = {
  login: "welcome",
  verify: "login",
  forgot: "login",
  "reset-code": "forgot",
  "reg-business": "welcome",
  "reg-name": "reg-business",
  "reg-email": "reg-name",
  "reg-phone": "reg-email",
  "reg-password": "reg-phone",
  "join-name": "welcome",
  "join-email": "join-name",
  "join-phone": "join-email",
  "join-password": "join-phone",
};

/** Kod tekrar gönderilmeden önce beklenen süre (sn) */
const RESEND_WAIT = 45;

/** Kelimeler arasına boşluk koymayan diller (onay cümlesinin parçaları bitişik yazılır) */
const TIGHT = ["ja", "zh"];
/** Cümle sonu parçası bir önceki kelimeye bitişen diller (Korecede ek, Japonca ve Çincede boşluksuz yazım) */
const ATTACHED_END = ["ja", "zh", "ko"];

/** Kayıt ekranındaki yasal sayfalar; Türkçe dışındaki dillerde İngilizce sayfalar açılır */
/** 6698 sayılı KVKK aydınlatma metni (Türkçe; Türkiye'deki kullanıcılar için zorunlu bilgilendirme) */
const KVKK_URL = "https://hesabimmuhasebe.com/kvkk.html";

const legalUrl = (page: "terms" | "privacy") =>
  getLanguage() === "tr"
    ? `https://hesabimmuhasebe.com/${page === "terms" ? "kullanim-kosullari" : "gizlilik"}.html`
    : `https://hesabimmuhasebe.com/en/${page}.html`;

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
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword1] = useState("");
  const [show, setShow] = useState(false);
  const [code, setCode] = useState("");
  const [owner, setOwner] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  // Kodun gönderildiği e-posta ve doğrulanmış oturum (şifre belirlenip cihaza yazılana kadar)
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [pendingSession, setPendingSession] = useState<Session | null>(null);
  // Şifre sıfırlama: e-postadaki bağlantının verdiği geçici anahtar
  const [resetToken, setResetToken] = useState<string | null>(recoveryToken ?? null);
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
  const phoneId = normalizePhone(phone) ?? "";
  const ownerId = owner.includes("@") ? owner.trim() : normalizePhone(owner) ?? "";
  const validEmail = /^\S+@\S+\.\S+$/.test(email.trim());
  const loginPhone = normalizePhone(email) ?? "";
  const validLogin = method === "email" ? validEmail : loginPhone !== "";
  const validOwner = ownerId.includes("@") ? /^\S+@\S+\.\S+$/.test(ownerId) : ownerId !== "";
  const validCode = /^\d{6,8}$/.test(code);
  const strongEnough = password.length >= 6;

  function go(next: Screen) {
    setScreen(next);
    setError(null);
    setInfo(null);
  }

  function describe(e: unknown): string {
    const reason = e instanceof CloudError ? e.code : "unknown";
    switch (reason) {
      case "invalid_credentials": return t("Bilgiler veya şifre hatalı.");
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

  /** Kayıt ya da katılma: hesap e-postayla açılır ve kod gönderilir */
  async function createAccount(next: Screen, afterCode: Screen) {
    const result = await signUp(email.trim(), password, {
      name: name.trim(),
      phone: phoneId || undefined,
    }).catch((e: unknown) => {
      // Telefon başka hesapta: telefon adımına dönülür (numara değiştirilebilir ya da atlanabilir)
      if (e instanceof CloudError && e.code === "phone_taken") go(next === "join-code" ? "join-phone" : "reg-phone");
      throw e;
    });
    haptic("success");
    if (result === "pending") {
      codeSent(email.trim(), next);
    } else {
      setPendingSession(result);
      setPassword1("");
      go(afterCode);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    switch (screen) {
      case "login":
        if (!validLogin || !password) return;
        return run(async () => {
          const login = method === "email" ? email.trim() : loginPhone;
          try {
            onSession(await signIn(login, password));
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
          await setPassword(resetToken ?? "", password);
          haptic("success");
          setResetToken(null);
          onRecoveryDone();
          setPassword1("");
          go("login");
          setInfo(t("Şifreniz yenilendi. Yeni şifrenizle giriş yapın."));
        });
      case "reg-business":
        if (business.trim()) go("reg-name");
        return;
      case "reg-name":
        if (name.trim()) go("reg-email");
        return;
      case "reg-email":
        if (validEmail) go("reg-phone");
        return;
      case "reg-phone":
        if (phone.trim() === "" || phoneId) go("reg-password");
        return;
      case "reg-password":
        if (!strongEnough) return;
        return run(() => createAccount("reg-code", "reg-done"));
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
          setPendingSession(session);
          go("reg-done");
        });
      case "reg-done":
        if (pendingSession) {
          saveSession(pendingSession);
          onSession(pendingSession, { isNew: true, businessName: business.trim() });
        }
        return;
      case "join-name":
        if (name.trim()) go("join-email");
        return;
      case "join-email":
        if (validEmail) go("join-phone");
        return;
      case "join-phone":
        if (phone.trim() === "" || phoneId) go("join-password");
        return;
      case "join-password":
        if (!strongEnough) return;
        return run(() => createAccount("join-code", "join-owner"));
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
          setPendingSession(session);
          go("join-owner");
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

  /** Kodu e-postaya yeniden gönderir */
  async function resend() {
    if (!pendingEmail || resendIn > 0) return;
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
        </div>
        <div className="ob-actions">
          <button type="button" className="ob-btn is-primary" onClick={() => go("login")}>
            {t("Giriş yap")}
          </button>
          <button type="button" className="ob-btn is-light" onClick={() => go("reg-business")}>
            {t("Üye ol")}
          </button>
          <button type="button" className="ob-btn is-outline" onClick={() => go("join-name")}>
            {t("Ekibe katıl")}
          </button>
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

  const phoneField = (
    <div className="field">
      <label htmlFor="auth-phone">{t("Telefon (isteğe bağlı)")}</label>
      <PhoneField id="auth-phone" value={phone} onChange={setPhone} />
      <p className="field-hint">{t("Telefon numaranızla da giriş yapabilirsiniz. Bu adımı atlayabilirsiniz.")}</p>
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
              <label htmlFor="auth-email-login">{t("Telefon")}</label>
              <PhoneField id="auth-email-login" value={email} onChange={setEmail} />
            </div>
          )}
          {passwordField(t("Şifre"), "current-password")}
          <button type="button" className="help-link ob-forgot" onClick={() => go("forgot")}>
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
      lead = t("Hesabınızın e-posta adresini yazın; size 6 haneli bir kod göndereceğiz.");
      body = emailField("auth-email-reset");
      action = t("KOD GÖNDER");
      ready = validEmail;
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
    case "reg-name":
    case "join-name":
      title = t("Adınız soyadınız");
      lead = screen === "reg-name" ? t("Ekip arkadaşlarınız sizi bu adla görür.") : t("Yetkili, isteğinizi bu adla görür.");
      body = (
        <div className="field">
          <label htmlFor="auth-name">{t("Ad soyad")}</label>
          <input id="auth-name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
      );
      ready = name.trim() !== "";
      break;
    case "reg-email":
    case "join-email":
      title = t("E-posta adresiniz");
      lead = t("Hesabınızı bu adrese gelen kodla doğrulayacağız.");
      body = emailField(screen === "reg-email" ? "auth-email" : "auth-email-join");
      ready = validEmail;
      break;
    case "reg-phone":
    case "join-phone":
      title = t("Telefon numaranız");
      lead = t("Girişte bu numara ve şifrenizle de giriş yapabilirsiniz. SMS gönderilmez.");
      body = phoneField;
      action = phone.trim() === "" ? t("ATLA") : t("DEVAM");
      ready = true;
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
      lead = t("{b} açıldı. Telefon ve e-posta bilgilerinizi istediğiniz zaman Ayarlar → Hesabım bölümünden düzenleyebilirsiniz.", { b: business.trim() });
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
        {done && body}
        <h2 className="ob-heading">{title}</h2>
        {lead && <p className="ob-lead">{lead}</p>}
        {info && <p className="form-success" role="status">{info}</p>}
        {!done && body}
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="ob-spacer" />
        {action && (
          <button className="primary-btn" type="submit" disabled={busy || !ready}>
            {busy ? t("Bekleyin…") : action}
          </button>
        )}
      </form>
    </div>
  );
}
