import { useState, type FormEvent } from "react";
import {
  CloudError,
  normalizePhone,
  resetWithSms,
  sendResetEmail,
  sendResetSms,
  setPassword,
  signIn,
  signUp,
  type Session,
} from "../lib/cloud";
import { haptic } from "../lib/haptics";
import { t } from "../lib/i18n";

/** Giriş ekranının modları: giriş, kayıt, şifremi unuttum, SMS kodu, e-postadan gelen yeni şifre */
type Mode = "login" | "register" | "forgot" | "sms" | "recovery";

/**
 * Giriş ve kayıt ekranı. Kayıtta e-posta ve telefon zorunlu; doğrulama e-posta ile yapılır.
 * Giriş e-posta ya da telefonla yapılır. Şifre sıfırlama tercih edilen kanala (e-posta ya da SMS) gider.
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
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [channel, setChannel] = useState<"email" | "sms">("email");
  const [code, setCode] = useState("");
  const [password, setPassword1] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  // Şifre sıfırlamada SMS'e gönderilen telefon
  const [smsPhone, setSmsPhone] = useState("");

  const mail = email.trim();
  const validMail = /^\S+@\S+\.\S+$/.test(mail);
  const validPhone = normalizePhone(phone) !== null;
  const validIdentifier = identifier.includes("@") ? /^\S+@\S+\.\S+$/.test(identifier.trim()) : normalizePhone(identifier) !== null;
  const strongEnough = password.length >= 6;

  const canSubmit = !busy && (
    mode === "login"
      ? identifier.trim() !== "" && password !== ""
      : mode === "register"
        ? business.trim() !== "" && validMail && validPhone && strongEnough
        : mode === "forgot"
          ? channel === "email" ? validMail : normalizePhone(phone) !== null
          : mode === "sms"
            ? code.trim().length >= 4 && strongEnough
            : strongEnough
  );

  function describe(e: unknown): string {
    const code = e instanceof CloudError ? e.code : "unknown";
    switch (code) {
      case "invalid_credentials": return t("E-posta/telefon veya şifre hatalı.");
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
        onSession(await signIn(identifier.trim(), password));
      } else if (mode === "register") {
        const result = await signUp(mail, phone.trim(), password);
        if (result === "pending") {
          haptic("success");
          setMode("login");
          setIdentifier(mail);
          setInfo(t("Hesabınız oluşturuldu. E-postanıza gelen bağlantıyla doğrulayın, sonra giriş yapın."));
        } else {
          onSession(result, { isNew: true, businessName: business.trim() });
        }
      } else if (mode === "forgot") {
        if (channel === "email") {
          await sendResetEmail(mail);
          haptic("success");
          setInfo(t("Şifre yenileme bağlantısı e-postanıza gönderildi."));
        } else {
          const normalized = normalizePhone(phone) ?? "";
          await sendResetSms(normalized);
          haptic("success");
          setSmsPhone(normalized);
          setMode("sms");
          setInfo(t("Doğrulama kodu telefonunuza gönderildi."));
        }
      } else if (mode === "sms") {
        await resetWithSms(smsPhone, code.trim(), password);
        haptic("success");
        setMode("login");
        setPassword1("");
        setInfo(t("Şifreniz yenilendi. Yeni şifrenizle giriş yapın."));
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

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setInfo(null);
  };

  const submitLabel = {
    login: t("GİRİŞ YAP"),
    register: t("KAYIT OL"),
    forgot: channel === "email" ? t("BAĞLANTI GÖNDER") : t("KOD GÖNDER"),
    sms: t("ŞİFREYİ YENİLE"),
    recovery: t("ŞİFREYİ YENİLE"),
  }[mode];

  const subtitle = {
    login: t("Hesabınıza giriş yapın"),
    register: t("Yeni hesap oluşturun"),
    forgot: t("Şifrenizi yenileyin"),
    sms: t("Telefonunuza gelen kodu girin"),
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
      {(mode === "register" || mode === "sms" || mode === "recovery") && <p className="field-hint">{t("En az 6 karakter.")}</p>}
    </div>
  );

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={submit} noValidate>
        <div className="auth-brand" aria-hidden="true">
          <img src="/logo.svg" alt="" />
        </div>
        <h1>Hesabım</h1>
        <p className="auth-sub">{subtitle}</p>

        {(mode === "login" || mode === "register") && (
          <div className="auth-tabs" role="tablist">
            <button type="button" role="tab" aria-selected={mode === "login"} className={mode === "login" ? "is-active" : ""} onClick={() => switchMode("login")}>
              {t("Giriş yap")}
            </button>
            <button type="button" role="tab" aria-selected={mode === "register"} className={mode === "register" ? "is-active" : ""} onClick={() => switchMode("register")}>
              {t("Kayıt ol")}
            </button>
          </div>
        )}

        {mode === "login" && (
          <>
            <div className="field">
              <label htmlFor="auth-identifier">{t("E-posta veya telefon")}</label>
              <input
                id="auth-identifier"
                inputMode="email"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
              />
              {identifier.trim() !== "" && !validIdentifier && <p className="field-hint">{t("Geçerli bir e-posta ya da telefon yazın.")}</p>}
            </div>
            {passwordField}
          </>
        )}

        {mode === "register" && (
          <>
            <div className="field">
              <label htmlFor="auth-business">{t("İşletme adı")}</label>
              <input id="auth-business" autoComplete="organization" value={business} onChange={(e) => setBusiness(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="auth-email">{t("E-posta")}</label>
              <input id="auth-email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" autoCorrect="off" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="auth-phone">{t("Telefon")}</label>
              <input id="auth-phone" type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
              {phone.trim() !== "" && !validPhone && <p className="field-hint">{t("Geçerli bir telefon numarası yazın.")}</p>}
            </div>
            {passwordField}
          </>
        )}

        {mode === "forgot" && (
          <>
            <div className="auth-tabs" role="radiogroup" aria-label={t("Kodu nereye gönderelim?")}>
              <button type="button" role="radio" aria-checked={channel === "email"} className={channel === "email" ? "is-active" : ""} onClick={() => setChannel("email")}>
                {t("E-posta")}
              </button>
              <button type="button" role="radio" aria-checked={channel === "sms"} className={channel === "sms" ? "is-active" : ""} onClick={() => setChannel("sms")}>
                {t("Telefon (SMS)")}
              </button>
            </div>
            {channel === "email" ? (
              <div className="field">
                <label htmlFor="auth-email-reset">{t("E-posta")}</label>
                <input id="auth-email-reset" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            ) : (
              <div className="field">
                <label htmlFor="auth-phone-reset">{t("Telefon")}</label>
                <input id="auth-phone-reset" type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
            )}
          </>
        )}

        {mode === "sms" && (
          <>
            <div className="field">
              <label htmlFor="auth-code">{t("Doğrulama kodu")}</label>
              <input id="auth-code" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} />
            </div>
            {passwordField}
          </>
        )}

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
        {(mode === "forgot" || mode === "sms") && (
          <button type="button" className="help-link" onClick={() => switchMode("login")}>
            {t("Girişe dön")}
          </button>
        )}
      </form>
    </div>
  );
}
