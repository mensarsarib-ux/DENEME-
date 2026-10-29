import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Capacitor } from "@capacitor/core";
import { Keyboard } from "@capacitor/keyboard";
import {
  CloudError,
  findBusinessByOwnerEmail,
  isEmailLogin,
  normalizePhone,
  requestJoin,
  resendSignupCode,
  saveSession,
  sendResetEmail,
  sendResetSms,
  setPassword,
  signIn,
  signUp,
  temporaryPassword,
  verifyResetSms,
  verifySignupCode,
  type Session,
} from "../lib/cloud";
import { haptic } from "../lib/haptics";
import { getLanguage, t } from "../lib/i18n";
import { Svg } from "./Icon";
import PhoneField from "./PhoneField";

/**
 * Açılış ve hesap ekranları. Açılışta logo, ardından Giriş yap / Üye ol / Ekibe katıl.
 * Üye ol ve Ekibe katıl her adımda tek soru soran sihirbazlardır; kayıt telefonla yapılır ve SMS koduyla doğrulanır.
 * E-posta sonradan Ayarlar → Hesabım'dan eklenir; giriş e-posta ya da telefonla yapılabilir.
 */
type Screen =
  | "welcome"
  | "login"
  | "verify"
  | "forgot"
  | "forgot-email"
  | "forgot-phone"
  | "reset-code"
  | "new-password"
  | "reg-business"
  | "reg-name"
  | "reg-phone"
  | "reg-code"
  | "reg-password"
  | "reg-done"
  | "join-name"
  | "join-phone"
  | "join-code"
  | "join-password"
  | "join-owner"
  | "join-sent";

/** Sihirbaz adımları (ilerleme çizgisi için) */
const REGISTER: Screen[] = ["reg-business", "reg-name", "reg-phone", "reg-code", "reg-password"];
const JOIN: Screen[] = ["join-name", "join-phone", "join-code", "join-password", "join-owner"];

/** Geri düğmesinin götürdüğü ekran; yoksa geri düğmesi gösterilmez */
const BACK: Partial<Record<Screen, Screen>> = {
  login: "welcome",
  verify: "login",
  forgot: "login",
  "forgot-email": "forgot",
  "forgot-phone": "forgot",
  "reset-code": "forgot-phone",
  "reg-business": "welcome",
  "reg-name": "reg-business",
  "reg-phone": "reg-name",
  "reg-code": "reg-phone",
  "join-name": "welcome",
  "join-phone": "join-name",
  "join-code": "join-phone",
};

/** Kod tekrar gönderilmeden önce beklenen süre (sn) */
const RESEND_WAIT = 45;

/** Kelimeler arasına boşluk koymayan diller (onay cümlesinin parçaları bitişik yazılır) */
const TIGHT = ["ja", "zh"];
/** Cümle sonu parçası bir önceki kelimeye bitişen diller (Korecede ek, Japonca ve Çincede boşluksuz yazım) */
const ATTACHED_END = ["ja", "zh", "ko"];

/** Kayıt ekranındaki yasal sayfalar; Türkçe dışındaki dillerde İngilizce sayfalar açılır */
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
  const [method, setMethod] = useState<"email" | "phone">("phone");
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
  // Kodun gönderildiği e-posta ya da telefon
  const [pendingId, setPendingId] = useState<string | null>(null);
  // Kod doğrulandı, şifre henüz belirlenmedi (kayıt ve katılma sihirbazında)
  const [pendingSession, setPendingSession] = useState<Session | null>(null);
  // Şifre sıfırlama: e-postadaki bağlantının ya da SMS kodunun verdiği geçici anahtar
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

  // Giriş kimliği: e-posta ya da +90… biçiminde telefon numarası
  const phoneId = normalizePhone(phone) ?? "";
  const loginId = method === "email" ? email.trim() : phoneId;
  const validEmail = /^\S+@\S+\.\S+$/.test(email.trim());
  const validLogin = method === "email" ? validEmail : phoneId !== "";
  const ownerId = owner.includes("@") ? owner.trim() : normalizePhone(owner) ?? "";
  const validOwner = ownerId.includes("@") ? /^\S+@\S+\.\S+$/.test(ownerId) : ownerId !== "";
  const validCode = /^\d{6,8}$/.test(code);
  const strongEnough = password.length >= 6;

  function go(next: Screen) {
    setScreen(next);
    setError(null);
    setInfo(null);
  }

  function describe(e: unknown, byPhone: boolean): string {
    const reason = e instanceof CloudError ? e.code : "unknown";
    switch (reason) {
      case "invalid_credentials": return byPhone ? t("Telefon numarası veya şifre hatalı.") : t("E-posta veya şifre hatalı.");
      case "email_taken": return byPhone ? t("Bu telefon numarasıyla zaten bir hesap var; giriş yapın.") : t("Bu e-posta ile zaten bir hesap var; giriş yapın.");
      case "weak_password": return t("Şifre en az 6 karakter olmalı.");
      case "email_not_confirmed": return byPhone ? t("Telefonunuz henüz doğrulanmadı. SMS ile gelen kodu girin.") : t("E-postanız henüz doğrulanmadı. E-postanıza gelen 6 haneli kodu girin.");
      case "network": return t("Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edin.");
      default: return t("Bir sorun oluştu; biraz sonra tekrar deneyin.");
    }
  }

  /** Kod gönderildi bilgisi: e-postaya ya da SMS ile */
  const sentInfo = (id: string) =>
    isEmailLogin(id)
      ? t("{m} adresine 6 haneli bir doğrulama kodu gönderdik.", { m: id })
      : t("{m} numarasına SMS ile 6 haneli bir doğrulama kodu gönderdik.", { m: id });

  /** Bir işlemi meşgul göstergesi ve hata mesajıyla çalıştırır */
  async function run(action: () => Promise<void>, byPhone = true) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      haptic("warning");
      setError(describe(e, byPhone));
    } finally {
      setBusy(false);
    }
  }

  /** Kod ekranına geçer ve kodun gittiği yeri yazar */
  function codeSent(id: string, next: Screen) {
    setPendingId(id);
    setCode("");
    setResendIn(RESEND_WAIT);
    go(next);
    setInfo(sentInfo(id));
  }

  /** Kayıt ve katılmada telefona SMS kodu gönderir (hesap rastgele bir şifreyle açılır, şifre sonra belirlenir) */
  async function sendSignupCode(next: Screen, afterVerify: Screen) {
    const result = await signUp(phoneId, temporaryPassword(), { name: name.trim() });
    haptic("success");
    if (result === "pending") {
      codeSent(phoneId, next);
    } else {
      setPendingSession(result);
      setPassword1("");
      go(afterVerify);
    }
  }

  /** Kod doğrulanamadıysa uyarı gösterir */
  function wrongCode() {
    haptic("warning");
    setError(t("Kod hatalı ya da süresi dolmuş. Yeni kod isteyin."));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    switch (screen) {
      case "login":
        if (!validLogin || !password) return;
        return run(async () => {
          try {
            onSession(await signIn(loginId, password));
          } catch (e) {
            // Kayıt olup kodu girmeden çıkan kişi: yeni kod gönderilir ve kod ekranı açılır
            if (e instanceof CloudError && e.code === "email_not_confirmed") {
              await resendSignupCode(loginId).catch(() => undefined);
              haptic("warning");
              codeSent(loginId, "verify");
              return;
            }
            throw e;
          }
        }, method === "phone");
      case "verify":
        if (!validCode) return;
        return run(async () => {
          const session = await verifySignupCode(pendingId ?? loginId, code);
          if (session === "invalid") return wrongCode();
          haptic("success");
          onSession(session, { isNew: true, businessName: "" });
        }, method === "phone");
      case "forgot-email":
        if (!validEmail) return;
        return run(async () => {
          await sendResetEmail(email.trim());
          haptic("success");
          setInfo(t("Şifre yenileme bağlantısı e-postanıza gönderildi."));
        }, false);
      case "forgot-phone":
        if (!phoneId) return;
        return run(async () => {
          await sendResetSms(phoneId);
          haptic("success");
          codeSent(phoneId, "reset-code");
        });
      case "reset-code":
        if (!validCode) return;
        return run(async () => {
          const token = await verifyResetSms(pendingId ?? phoneId, code);
          if (token === "invalid") return wrongCode();
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
        if (name.trim()) go("reg-phone");
        return;
      case "join-name":
        if (name.trim()) go("join-phone");
        return;
      case "reg-phone":
        if (!phoneId) return;
        return run(() => sendSignupCode("reg-code", "reg-password"));
      case "join-phone":
        if (!phoneId) return;
        return run(() => sendSignupCode("join-code", "join-password"));
      case "reg-code":
      case "join-code":
        if (!validCode) return;
        return run(async () => {
          // Oturum, şifre belirlenince cihaza yazılır
          const session = await verifySignupCode(pendingId ?? phoneId, code, false);
          if (session === "invalid") return wrongCode();
          haptic("success");
          setPendingSession(session);
          setPassword1("");
          go(screen === "reg-code" ? "reg-password" : "join-password");
        });
      case "reg-password":
      case "join-password":
        if (!strongEnough || !pendingSession) return;
        return run(async () => {
          await setPassword(pendingSession.accessToken, password);
          saveSession(pendingSession);
          haptic("success");
          go(screen === "reg-password" ? "reg-done" : "join-owner");
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
      case "reg-done":
        if (pendingSession) onSession(pendingSession, { isNew: true, businessName: business.trim() });
        return;
      case "join-sent":
        if (pendingSession) onSession(pendingSession);
        return;
    }
  }

  /** Kodu tekrar gönderir: şifre sıfırlamada giriş kodu, diğerlerinde doğrulama kodu */
  async function resend() {
    if (!pendingId || resendIn > 0) return;
    try {
      if (screen === "reset-code") await sendResetSms(pendingId);
      else await resendSignupCode(pendingId);
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

  const emailField = (
    <div className="field">
      <label htmlFor="auth-email">{t("E-posta")}</label>
      <input
        id="auth-email"
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
      <label htmlFor="auth-phone">{t("Telefon")}</label>
      <PhoneField id="auth-phone" value={phone} onChange={setPhone} />
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
      {legalEnd}
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
          {method === "email" ? emailField : phoneField}
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
      title = method === "phone" ? t("Telefonunuzu doğrulayın") : t("E-postanızı doğrulayın");
      body = codeField;
      action = t("DOĞRULA");
      ready = validCode;
      break;
    case "forgot":
      title = t("Şifremi unuttum");
      lead = t("Şifrenizi nasıl yenilemek istersiniz?");
      body = (
        <div className="ob-choices">
          <button type="button" className="ob-choice" onClick={() => go("forgot-email")}>
            <span className="ob-choice-icon" aria-hidden="true">✉️</span>
            <span>
              <strong>{t("E-posta ile")}</strong>
              <small>{t("Adresinize yenileme bağlantısı gönderilir")}</small>
            </span>
          </button>
          <button type="button" className="ob-choice" onClick={() => go("forgot-phone")}>
            <span className="ob-choice-icon" aria-hidden="true">💬</span>
            <span>
              <strong>{t("Telefon ile")}</strong>
              <small>{t("Numaranıza SMS ile kod gönderilir")}</small>
            </span>
          </button>
        </div>
      );
      action = null;
      break;
    case "forgot-email":
      title = t("Şifremi unuttum");
      lead = t("Hesabınızın e-posta adresini yazın; yenileme bağlantısı göndereceğiz.");
      body = emailField;
      action = t("BAĞLANTI GÖNDER");
      ready = validEmail;
      break;
    case "forgot-phone":
      title = t("Şifremi unuttum");
      lead = t("Hesabınızın telefon numarasını yazın; SMS ile kod göndereceğiz.");
      body = phoneField;
      action = t("KOD GÖNDER");
      ready = phoneId !== "";
      break;
    case "reset-code":
    case "reg-code":
    case "join-code":
      title = t("SMS kodunu girin");
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
    case "reg-phone":
    case "join-phone":
      title = t("Telefon numaranız");
      lead = t("Numaranızı doğrulamak için SMS ile kod göndereceğiz.");
      body = phoneField;
      action = t("KOD GÖNDER");
      ready = phoneId !== "";
      break;
    case "reg-password":
    case "join-password":
      title = t("Şifre belirleyin");
      lead = t("Girişte telefon numaranız ve bu şifreyle girersiniz.");
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
      lead = t("{b} açıldı. E-posta adresinizi istediğiniz zaman Ayarlar → Hesabım bölümünden ekleyebilirsiniz.", { b: business.trim() });
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
