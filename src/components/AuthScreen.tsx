import { useState, type FormEvent } from "react";
import { CloudError, requestPasswordReset, signIn, signUp, type Session } from "../lib/cloud";
import { haptic } from "../lib/haptics";
import { t } from "../lib/i18n";

type Mode = "login" | "register" | "reset";

/** Kayıt ol / giriş yap ekranı: e-posta ve şifre; aynı hesapla birden fazla telefondan girilebilir */
export default function AuthScreen({
  onSession,
}: {
  /** Giriş başarılı olunca; yeni kayıtta isNew ve işletme adı da gelir */
  onSession: (session: Session, info?: { isNew: boolean; businessName: string }) => void;
}) {
  const [mode, setMode] = useState<Mode>("login");
  const [business, setBusiness] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const mail = email.trim();
  const validMail = /^\S+@\S+\.\S+$/.test(mail);
  const canSubmit =
    !busy &&
    validMail &&
    (mode === "reset" || password.length >= 6) &&
    (mode !== "register" || business.trim() !== "");

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
        const result = await signUp(mail, password);
        if (result === "pending") {
          haptic("success");
          setMode("login");
          setInfo(t("Hesabınız oluşturuldu. E-postanıza gelen bağlantıyla doğrulayın, sonra giriş yapın."));
        } else {
          onSession(result, { isNew: true, businessName: business.trim() });
        }
      } else {
        await requestPasswordReset(mail);
        haptic("success");
        setInfo(t("Şifre yenileme bağlantısı e-postanıza gönderildi."));
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

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={submit} noValidate>
        <div className="auth-brand" aria-hidden="true">
          <img src="/logo.svg" alt="" />
        </div>
        <h1>Hesabım</h1>
        <p className="auth-sub">
          {mode === "login" && t("Hesabınıza giriş yapın")}
          {mode === "register" && t("Yeni hesap oluşturun")}
          {mode === "reset" && t("Şifrenizi yenileyin")}
        </p>

        {mode !== "reset" && (
          <div className="auth-tabs" role="tablist">
            <button type="button" role="tab" aria-selected={mode === "login"} className={mode === "login" ? "is-active" : ""} onClick={() => switchMode("login")}>
              {t("Giriş yap")}
            </button>
            <button type="button" role="tab" aria-selected={mode === "register"} className={mode === "register" ? "is-active" : ""} onClick={() => switchMode("register")}>
              {t("Kayıt ol")}
            </button>
          </div>
        )}

        {mode === "register" && (
          <div className="field">
            <label htmlFor="auth-business">{t("İşletme adı")}</label>
            <input id="auth-business" autoComplete="organization" value={business} onChange={(e) => setBusiness(e.target.value)} />
          </div>
        )}
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
        {mode !== "reset" && (
          <div className="field">
            <label htmlFor="auth-password">{t("Şifre")}</label>
            <div className="auth-password">
              <input
                id="auth-password"
                type={show ? "text" : "password"}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? t("Şifreyi gizle") : t("Şifreyi göster")}>
                {show ? t("Gizle") : t("Göster")}
              </button>
            </div>
            {mode === "register" && <p className="field-hint">{t("En az 6 karakter.")}</p>}
          </div>
        )}

        {error && <p className="form-error" role="alert">{error}</p>}
        {info && <p className="form-success" role="status">{info}</p>}

        <button className="primary-btn" type="submit" disabled={!canSubmit}>
          {busy ? t("Bekleyin…") : mode === "login" ? t("GİRİŞ YAP") : mode === "register" ? t("KAYIT OL") : t("BAĞLANTI GÖNDER")}
        </button>

        {mode === "login" && (
          <button type="button" className="help-link" onClick={() => switchMode("reset")}>
            {t("Şifremi unuttum")}
          </button>
        )}
        {mode === "reset" && (
          <button type="button" className="help-link" onClick={() => switchMode("login")}>
            {t("Girişe dön")}
          </button>
        )}
      </form>
    </div>
  );
}
