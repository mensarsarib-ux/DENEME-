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
  verifySignupCode,
  type Session,
} from "../lib/cloud";
import { haptic } from "../lib/haptics";
import { t } from "../lib/i18n";
import PhoneField from "./PhoneField";

/** Giriş ekranının modları: giriş, kayıt, şifremi unuttum, e-postadan gelen yeni şifre */
type Mode = "login" | "register" | "join" | "forgot" | "recovery" | "code";

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
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword1] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  // Kod gönderilmiş olan e-posta, kodu girilen değer ve katılınacak işletme (katılma akışında)
  const [pendingMail, setPendingMail] = useState<string | null>(null);
  const [pendingJoin, setPendingJoin] = useState<string | null>(null);
  const [code, setCode] = useState("");

  const mail = email.trim();
  const validMail = /^\S+@\S+\.\S+$/.test(mail);
  const validPhone = normalizePhone(phone) !== null;
  const strongEnough = password.length >= 6;
  const ownerMail = ownerEmail.trim();
  const validOwner = /^\S+@\S+\.\S+$/.test(ownerMail);

  const canSubmit =
    !busy &&
    (mode === "code"
      ? /^\d{6,8}$/.test(code)
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
    if (mode === "code") {
      try {
        const session = await verifySignupCode(pendingMail ?? mail, code);
        if (session === "invalid") {
          haptic("warning");
          setError(t("Kod hatalı ya da süresi dolmuş. Yeni kod isteyin."));
          return;
        }
        // Katılma akışında isteği gönder; kayıt akışında yeni işletme açılır
        if (pendingJoin) {
          await requestJoin(session, pendingJoin);
          haptic("success");
          onSession(session);
        } else {
          haptic("success");
          onSession(session, { isNew: true, businessName: business.trim() });
        }
      } catch (e) {
        haptic("warning");
        setError(describe(e));
      } finally {
        setBusy(false);
      }
      return;
    }
    setInfo(null);
    try {
      if (mode === "login") {
        onSession(await signIn(mail, password));
      } else if (mode === "register") {
        const result = await signUp(mail, phone.trim(), password);
        if (result === "pending") {
          haptic("success");
          setPendingMail(mail);
          setPendingJoin(null);
          setCode("");
          setMode("code");
          setInfo(t("{m} adresine 6 haneli bir doğrulama kodu gönderdik.", { m: mail }));
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
          setPendingMail(mail);
          setPendingJoin(found[0].id);
          setCode("");
          setMode("code");
          setInfo(t("{m} adresine 6 haneli bir doğrulama kodu gönderdik.", { m: mail }));
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

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setInfo(null);
  };

  const submitLabel = {
    code: t("KODU ONAYLA"),
    login: t("GİRİŞ YAP"),
    register: t("KAYIT OL"),
    join: t("KAYIT OL VE KATIL"),
    forgot: t("BAĞLANTI GÖNDER"),
    recovery: t("ŞİFREYİ YENİLE"),
  }[mode];

  const subtitle = {
    code: t("E-postanızı doğrulayın"),
    login: t("Hesabınıza giriş yapın"),
    register: t("Yeni hesap oluşturun"),
    join: t("Var olan işletmeye katılın"),
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
      <form className="auth-card" onSubmit={submit} noValidate>
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

        {mode === "forgot" && emailField("auth-email-reset")}

        {mode === "recovery" && passwordField}

        {error && <p className="form-error" role="alert">{error}</p>}
        {info && <p className="form-success" role="status">{info}</p>}
        {mode === "code" && (
          <>
            <div className="field">
              <label htmlFor="auth-code">{t("Doğrulama kodu")}</label>
              <input
                id="auth-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={8}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              />
            </div>
            <button
              type="button"
              className="help-link"
              onClick={async () => {
                if (!pendingMail) return;
                try {
                  await resendSignupCode(pendingMail);
                  setInfo(t("Yeni doğrulama kodu gönderildi."));
                } catch {
                  setError(t("Gönderilemedi; bağlantınızı kontrol edin."));
                }
              }}
            >
              {t("Kodu tekrar gönder")}
            </button>
            <button type="button" className="help-link" onClick={() => switchMode("register")}>
              {t("Vazgeç")}
            </button>
          </>
        )}

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
