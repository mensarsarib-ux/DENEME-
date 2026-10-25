import { useState, type FormEvent } from "react";
import {
  CloudError,
  findBusinessAnon,
  normalizePhone,
  requestJoin,
  resendSignupCode,
  sendResetEmail,
  setPassword,
  signIn,
  signUp,
  type Session,
  verifySignupCode,
} from "../lib/cloud";
import { haptic } from "../lib/haptics";
import { t } from "../lib/i18n";
import PhoneField from "./PhoneField";

/** Giriş ekranının modları: giriş, kayıt, şifremi unuttum, e-postadan gelen yeni şifre */
type Mode = "login" | "register" | "join" | "verify" | "forgot" | "recovery";

/** Kod bekleyen kayıt: e-posta, katılınacak işletme ve (varsa) yeni işletme adı */
type Pending = { email: string; joinId: string | null; business: string | null };

/**
 * Giriş ve kayıt ekranı. Giriş yalnızca e-posta ve şifreyle yapılır.
 * Şifre sıfırlama bağlantısı e-postaya gönderilir.
 */
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
  const [mode, setMode] = useState<Mode>(recoveryToken ? "recovery" : "login");
  const [business, setBusiness] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [pending, setPending] = useState<Pending | null>(null);
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword1] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const mail = email.trim();
  const validMail = /^\S+@\S+\.\S+$/.test(mail);
  const validPhone = normalizePhone(phone) !== null;
  const strongEnough = password.length >= 6;
  const ownerMail = ownerEmail.trim();
  const validOwner = /^\S+@\S+\.\S+$/.test(ownerMail);

  const canSubmit =
    !busy &&
    (mode === "verify"
      ? code.trim().length >= 6
      : mode === "login"
      ? validMail && password !== ""
      : mode === "register"
        ? business.trim() !== "" && validMail && validPhone && strongEnough
        : mode === "join"
          ? validMail && validPhone && strongEnough && validOwner
          : mode === "forgot"
            ? validMail
            : strongEnough);

  function describe(e: unknown): string {
    const code = e instanceof CloudError ? e.code : "unknown";
    switch (code) {
      case "invalid_credentials": return t("E-posta veya şifre hatalı.");
      case "email_taken": return t("Bu e-posta ile zaten bir hesap var; giriş yapın.");
      case "weak_password": return t("Şifre en az 6 karakter olmalı.");
      case "email_not_confirmed": return t("E-postanızı doğrulayın: size gönderilen bağlantıya dokunun.");
      case "network": return t("Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edin.");
      default: return t("Bir sorun oluştu; biraz sonra tekrar deneyin.");
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      if (mode === "login") {
        onSession(await signIn(mail, password));
      } else if (mode === "register") {
        const result = await signUp(mail, phone.trim(), password);
        if (result === "pending") {
          haptic("success");
          setPending({ email: mail, joinId: null, business: business.trim() });
          setMode("verify");
        } else {
          onSession(result, { isNew: true, businessName: business.trim() });
        }
      } else if (mode === "join") {
        // Önce yetkilinin işletmesi bulunur; bulunamazsa hesap açılmaz
        const found = await findBusinessAnon(ownerMail);
        if (!found || found.length === 0) {
          haptic("warning");
          setError(t("Bu e-postaya ait bir işletme bulunamadı."));
          return;
        }
        const result = await signUp(mail, phone.trim(), password);
        if (result === "pending") {
          haptic("success");
          setPending({ email: mail, joinId: found[0].id, business: null });
          setMode("verify");
          return;
        }
        // Oturum açıldı: katılma isteği gönderilir, yetkili onaylayınca erişim açılır
        await requestJoin(result, found[0].id);
        haptic("success");
        onSession(result);
      } else if (mode === "forgot") {
        await sendResetEmail(mail);
        haptic("success");
        setInfo(t("Şifre yenileme bağlantısı e-postanıza gönderildi."));
      } else {
        // E-postadaki bağlantıdan gelindi: geçici belirteçle şifreyi değiştir
        await setPassword(recoveryToken ?? "", password);
        haptic("success");
        onRecoveryDone();
        setMode("login");
        setPassword1("");
        setInfo(t("Şifreniz yenilendi. Yeni şifrenizle giriş yapın."));
      }
    } catch (e) {
      haptic("warning");
      setError(describe(e));
    } finally {
      setBusy(false);
    }
  }

  /** E-postaya gelen kodu doğrular; katılma ise isteği gönderir */
  async function verify(event: FormEvent) {
    event.preventDefault();
    if (!pending || busy) return;
    setBusy(true);
    setError(null);
    try {
      const session = await verifySignupCode(pending.email, code);
      if (session === "invalid") {
        haptic("warning");
        setError(t("Kod hatalı ya da süresi dolmuş. Yeni kod isteyin."));
        return;
      }
      if (pending.joinId) {
        await requestJoin(session, pending.joinId);
        haptic("success");
        onSession(session);
      } else {
        haptic("success");
        onSession(session, { isNew: true, businessName: pending.business ?? "" });
      }
    } catch {
      setError(t("Doğrulanamadı; bağlantınızı kontrol edin."));
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    if (!pending) return;
    try {
      await resendSignupCode(pending.email);
      setInfo(t("Yeni kod gönderildi."));
    } catch {
      setError(t("Kod gönderilemedi; tekrar deneyin."));
    }
  }

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setInfo(null);
  };

  const submitLabel = {
    login: t("GİRİŞ YAP"),
    register: t("KAYIT OL"),
    join: t("KAYIT OL VE KATIL"),
    verify: t("DOĞRULA"),
    forgot: t("BAĞLANTI GÖNDER"),
    recovery: t("ŞİFREYİ YENİLE"),
  }[mode];

  const subtitle = {
    login: t("Hesabınıza giriş yapın"),
    register: t("Yeni hesap oluşturun"),
    join: t("Var olan işletmeye katılın"),
    verify: t("E-postanıza gelen kodu girin"),
    forgot: t("Şifrenizi yenileyin"),
    recovery: t("Yeni şifrenizi belirleyin"),
  }[mode];

  const passwordField = (
    <div className="field">
      <label htmlFor="auth-password">{mode === "login" ? t("Şifre") : t("Yeni şifre")}</label>
      <div className="auth-password">
        <input
          id="auth-password"
          type={show ? "text" : "password"}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          value={password}
          onChange={(e) => setPassword1(e.target.value)}
        />
        <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? t("Şifreyi gizle") : t("Şifreyi göster")}>
          {show ? t("Gizle") : t("Göster")}
        </button>
      </div>
      {(mode === "register" || mode === "recovery") && <p className="field-hint">{t("En az 6 karakter.")}</p>}
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

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={mode === "verify" ? verify : submit} noValidate>
        <div className="auth-brand" aria-hidden="true">
          <img src="/logo.svg" alt="" />
        </div>
        <h1>Hesabım</h1>
        <p className="auth-sub">{subtitle}</p>

        {(mode === "login" || mode === "register" || mode === "join") && (
          <div className="auth-tabs auth-tabs-3" role="tablist">
            <button type="button" role="tab" aria-selected={mode === "login"} className={mode === "login" ? "is-active" : ""} onClick={() => switchMode("login")}>
              {t("Giriş yap")}
            </button>
            <button type="button" role="tab" aria-selected={mode === "register"} className={mode === "register" ? "is-active" : ""} onClick={() => switchMode("register")}>
              {t("Üye ol")}
            </button>
            <button type="button" role="tab" aria-selected={mode === "join"} className={mode === "join" ? "is-active" : ""} onClick={() => switchMode("join")}>
              {t("Katıl")}
            </button>
          </div>
        )}

        {mode === "login" && (
          <>
            {emailField("auth-email-login")}
            {passwordField}
          </>
        )}

        {mode === "register" && (
          <>
            <div className="field">
              <label htmlFor="auth-business">{t("İşletme adı")}</label>
              <input id="auth-business" autoComplete="organization" value={business} onChange={(e) => setBusiness(e.target.value)} />
            </div>
            {emailField("auth-email")}
            <div className="field">
              <label htmlFor="auth-phone">{t("Telefon")}</label>
              <PhoneField id="auth-phone" value={phone} onChange={setPhone} />
              {phone.trim() !== "" && !validPhone && <p className="field-hint">{t("Geçerli bir telefon numarası yazın.")}</p>}
            </div>
            {passwordField}
          </>
        )}

        {mode === "join" && (
          <>
            {emailField("auth-email-join")}
            <div className="field">
              <label htmlFor="auth-owner">{t("Yetkilinin e-postası")}</label>
              <input
                id="auth-owner"
                type="email"
                inputMode="email"
                autoCapitalize="none"
                autoCorrect="off"
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="auth-phone-join">{t("Telefon")}</label>
              <PhoneField id="auth-phone-join" value={phone} onChange={setPhone} />
              {phone.trim() !== "" && !validPhone && <p className="field-hint">{t("Geçerli bir telefon numarası yazın.")}</p>}
            </div>
            {passwordField}
          </>
        )}

        {mode === "verify" && pending && (
          <>
            <p className="field-hint">{t("{email} adresine 6 haneli bir kod gönderdik.", { email: pending.email })}</p>
            <div className="field">
              <label htmlFor="auth-code">{t("Doğrulama kodu")}</label>
              <input
                id="auth-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              />
            </div>
            <button type="button" className="help-link" onClick={resend}>
              {t("Kodu yeniden gönder")}
            </button>
          </>
        )}

        {mode === "forgot" && emailField("auth-email-reset")}

        {mode === "recovery" && passwordField}

        {error && <p className="form-error" role="alert">{error}</p>}
        {info && <p className="form-success" role="status">{info}</p>}

        <button className="primary-btn" type="submit" disabled={!canSubmit}>
          {busy ? t("Bekleyin…") : submitLabel}
        </button>

        {mode === "login" && (
          <button type="button" className="help-link" onClick={() => switchMode("forgot")}>
            {t("Şifremi unuttum")}
          </button>
        )}
        {mode === "forgot" && (
          <button type="button" className="help-link" onClick={() => switchMode("login")}>
            {t("Girişe dön")}
          </button>
        )}
      </form>
    </div>
  );
}
