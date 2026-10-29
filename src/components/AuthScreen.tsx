import { useEffect, useState, type FormEvent } from "react";
import { Capacitor } from "@capacitor/core";
import { Keyboard } from "@capacitor/keyboard";
import {
  CloudError,
  findBusinessByOwnerEmail,
  isEmailLogin,
  normalizePhone,
  requestJoin,
  resendSignupCode,
  sendResetEmail,
  sendResetSms,
  setPassword,
  signIn,
  signUp,
  verifyResetSms,
  verifySignupCode,
  type Session,
} from "../lib/cloud";
import { haptic } from "../lib/haptics";
import { getLanguage, t } from "../lib/i18n";
import PhoneField from "./PhoneField";

/**
 * Giriş ekranının modları: giriş, kayıt, katılma, şifremi unuttum, e-postadan gelen yeni şifre, doğrulama kodu
 * ve "owner": hesap açıldıktan sonra katılınacak işletmenin yetkilisini arama (yetkili bulunamazsa)
 */
type Mode = "login" | "register" | "join" | "forgot" | "recovery" | "code" | "owner" | "resetcode";

/** Giriş ve kayıt e-postayla ya da telefon numarasıyla (SMS koduyla doğrulanır) yapılır */
type Method = "email" | "phone";

/** Kelimeler arasına boşluk koymayan diller (onay cümlesinin parçaları bitişik yazılır) */
const TIGHT = ["ja", "zh"];
/** Cümle sonu parçası bir önceki kelimeye bitişen diller (Korecede ek, Japonca ve Çincede boşluksuz yazım) */
const ATTACHED_END = ["ja", "zh", "ko"];

/** Kayıt ekranındaki yasal sayfalar; Türkçe dışındaki dillerde İngilizce sayfalar açılır */
const legalUrl = (page: "terms" | "privacy") =>
  getLanguage() === "tr"
    ? `https://hesabimmuhasebe.com/${page === "terms" ? "kullanim-kosullari" : "gizlilik"}.html`
    : `https://hesabimmuhasebe.com/en/${page}.html`;

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
  const [method, setMethod] = useState<Method>("email");
  // Telefonla giriş/kayıtta giriş kimliği olan numara (isteğe bağlı telefon alanından ayrı)
  const [loginPhone, setLoginPhone] = useState("");
  // Telefonla şifre sıfırlamada SMS kodu doğrulanınca alınan geçici anahtar
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword1] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  // Kod gönderilmiş olan e-posta, kodu girilen değer ve katılınacak işletme (katılma akışında)
  const [pendingMail, setPendingMail] = useState<string | null>(null);
  // Yazı klavyesi açıkken kart yukarı çıkar; yerel uygulamada klavye olayıyla, tarayıcıda görünen alanla
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      const show = Keyboard.addListener("keyboardWillShow", () => setKeyboardOpen(true));
      const hide = Keyboard.addListener("keyboardWillHide", () => setKeyboardOpen(false));
      return () => {
        void show.then((h) => h.remove());
        void hide.then((h) => h.remove());
      };
    }
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => setKeyboardOpen(vv.height < window.innerHeight * 0.75);
    vv.addEventListener("resize", update);
    return () => vv.removeEventListener("resize", update);
  }, []);
  // Katılma akışında yetkilinin e-postası (kod doğrulandıktan sonra işletme bununla aranır)
  const [pendingJoin, setPendingJoin] = useState<string | null>(null);
  // Hesap açıldı ama yetkilinin işletmesi bulunamadı: oturum burada bekler, e-posta düzeltilip tekrar aranır
  const [joinSession, setJoinSession] = useState<Session | null>(null);
  const [code, setCode] = useState("");

  // Giriş kimliği: e-posta ya da +90… biçiminde telefon numarası
  const loginId = method === "email" ? email.trim() : normalizePhone(loginPhone) ?? "";
  const validId = method === "email" ? /^\S+@\S+\.\S+$/.test(loginId) : loginId !== "";
  // Telefon isteğe bağlı; yazıldıysa geçerli olmalı
  const validPhone = phone.trim() === "" || normalizePhone(phone) !== null;
  const strongEnough = password.length >= 6;
  // Yetkili e-postası ya da telefonuyla aranır
  const ownerMail = ownerEmail.includes("@") ? ownerEmail.trim() : normalizePhone(ownerEmail) ?? "";
  const validOwner = ownerMail.includes("@") ? /^\S+@\S+\.\S+$/.test(ownerMail) : ownerMail !== "";

  const canSubmit =
    !busy &&
    (mode === "code" || mode === "resetcode"
      ? /^\d{6,8}$/.test(code)
      : mode === "owner"
      ? validOwner
      : mode === "login"
      ? validId && password !== ""
      : mode === "register"
        ? business.trim() !== "" && validId && validPhone && strongEnough
        : mode === "join"
          ? validId && validPhone && strongEnough && validOwner
          : mode === "forgot"
            ? validId
            : strongEnough);

  function describe(e: unknown): string {
    const code = e instanceof CloudError ? e.code : "unknown";
    switch (code) {
      case "invalid_credentials": return method === "phone" ? t("Telefon numarası veya şifre hatalı.") : t("E-posta veya şifre hatalı.");
      case "email_taken": return method === "phone" ? t("Bu telefon numarasıyla zaten bir hesap var; giriş yapın.") : t("Bu e-posta ile zaten bir hesap var; giriş yapın.");
      case "weak_password": return t("Şifre en az 6 karakter olmalı.");
      case "email_not_confirmed": return method === "phone" ? t("Telefonunuz henüz doğrulanmadı. SMS ile gelen kodu girin.") : t("E-postanız henüz doğrulanmadı. E-postanıza gelen 6 haneli kodu girin.");
      case "network": return t("Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edin.");
      default: return t("Bir sorun oluştu; biraz sonra tekrar deneyin.");
    }
  }

  /**
   * Hesap açıldıktan sonra yetkilinin işletmesini bulur ve katılma isteği gönderir.
   * İşletme bulunamazsa oturum bekletilir; kişi e-postayı düzeltebilir ya da kendi işletmesini açabilir.
   */
  async function joinWith(session: Session, owner: string) {
    const found = await findBusinessByOwnerEmail(session, owner);
    if (found === "expired") throw new CloudError("unknown", "expired");
    if (found.length === 0) {
      haptic("warning");
      setJoinSession(session);
      setOwnerEmail(owner);
      setMode("owner");
      setInfo(null);
      setError(t("Bu e-posta ya da telefona ait bir işletme bulunamadı."));
      return;
    }
    await requestJoin(session, found[0].id);
    haptic("success");
    onSession(session);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    if (mode === "code") {
      try {
        const session = await verifySignupCode(pendingMail ?? loginId, code);
        if (session === "invalid") {
          haptic("warning");
          setError(t("Kod hatalı ya da süresi dolmuş. Yeni kod isteyin."));
          return;
        }
        // Katılma akışında işletme aranıp istek gönderilir; kayıt akışında yeni işletme açılır
        if (pendingJoin) {
          await joinWith(session, pendingJoin);
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
    if (mode === "owner") {
      try {
        if (joinSession) await joinWith(joinSession, ownerMail);
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
        try {
          onSession(await signIn(loginId, password));
        } catch (e) {
          // Kayıt olup kodu girmeden çıkan kişi: yeni kod gönderilir ve kod ekranı açılır
          if (e instanceof CloudError && e.code === "email_not_confirmed") {
            await resendSignupCode(loginId).catch(() => undefined);
            haptic("warning");
            setPendingMail(loginId);
            setPendingJoin(null);
            setCode("");
            setMode("code");
            setInfo(
              isEmailLogin(loginId)
                ? t("Hesabınız henüz doğrulanmadı. {m} adresine yeni bir doğrulama kodu gönderdik.", { m: loginId })
                : t("Hesabınız henüz doğrulanmadı. {m} numarasına SMS ile yeni bir doğrulama kodu gönderdik.", { m: loginId }),
            );
            return;
          }
          throw e;
        }
      } else if (mode === "register") {
        const result = await signUp(loginId, normalizePhone(phone) ?? "", password);
        if (result === "pending") {
          haptic("success");
          setPendingMail(loginId);
          setPendingJoin(null);
          setCode("");
          setMode("code");
          setInfo(sentInfo(loginId));
        } else {
          onSession(result, { isNew: true, businessName: business.trim() });
        }
      } else if (mode === "join") {
        // İşletme, hesap açılıp e-posta doğrulandıktan sonra aranır (giriş yapmadan arama kapalıdır)
        const result = await signUp(loginId, normalizePhone(phone) ?? "", password);
        if (result === "pending") {
          haptic("success");
          setPendingMail(loginId);
          setPendingJoin(ownerMail);
          setCode("");
          setMode("code");
          setInfo(sentInfo(loginId));
          return;
        }
        await joinWith(result, ownerMail);
      } else if (mode === "forgot") {
        if (method === "phone") {
          // Telefonla açılan hesap: SMS ile kod gönderilir, kod doğrulanınca yeni şifre istenir
          await sendResetSms(loginId);
          haptic("success");
          setPendingMail(loginId);
          setCode("");
          setMode("resetcode");
          setInfo(sentInfo(loginId));
          return;
        }
        await sendResetEmail(loginId);
        haptic("success");
        setInfo(t("Şifre yenileme bağlantısı e-postanıza gönderildi."));
      } else if (mode === "resetcode") {
        const token = await verifyResetSms(pendingMail ?? loginId, code);
        if (token === "invalid") {
          haptic("warning");
          setError(t("Kod hatalı ya da süresi dolmuş. Yeni kod isteyin."));
          return;
        }
        haptic("success");
        setResetToken(token);
        setPassword1("");
        setMode("recovery");
        setInfo(null);
      } else {
        // E-postadaki bağlantıdan ya da SMS kodundan gelindi: geçici belirteçle şifreyi değiştir
        await setPassword(resetToken ?? recoveryToken ?? "", password);
        setResetToken(null);
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

  /** Kod gönderildi bilgisi: e-postaya ya da SMS ile */
  const sentInfo = (id: string) =>
    isEmailLogin(id)
      ? t("{m} adresine 6 haneli bir doğrulama kodu gönderdik.", { m: id })
      : t("{m} numarasına SMS ile 6 haneli bir doğrulama kodu gönderdik.", { m: id });

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setInfo(null);
  };

  const submitLabel = {
    code: t("KODU ONAYLA"),
    resetcode: t("KODU ONAYLA"),
    owner: t("KATILMA İSTEĞİ GÖNDER"),
    login: t("GİRİŞ YAP"),
    register: t("KAYIT OL"),
    join: t("KAYIT OL VE KATIL"),
    forgot: method === "phone" ? t("KOD GÖNDER") : t("BAĞLANTI GÖNDER"),
    recovery: t("ŞİFREYİ YENİLE"),
  }[mode];

  const subtitle = {
    code: pendingMail && !isEmailLogin(pendingMail) ? t("Telefonunuzu doğrulayın") : t("E-postanızı doğrulayın"),
    resetcode: t("Şifrenizi yenileyin"),
    owner: t("Var olan işletmeye katılın"),
    login: t("Hesabınıza giriş yapın"),
    register: t("Yeni hesap oluşturun"),
    join: t("Var olan işletmeye katılın"),
    forgot: t("Şifrenizi yenileyin"),
    recovery: t("Yeni şifrenizi belirleyin"),
  }[mode];

  // Onay cümlesi parçalar hâlinde çevrilir; Japonca ve Çincede parçalar arasına boşluk konmaz
  const gap = TIGHT.includes(getLanguage()) ? "" : " ";
  const legalEnd = t("metinlerini okuyup kabul etmiş olursunuz.");

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

  /** Giriş kimliği alanı: seçilen yönteme göre e-posta ya da telefon numarası */
  const idField = (id: string) =>
    method === "phone" ? (
      <div className="field">
        <label htmlFor={id}>{t("Telefon")}</label>
        <PhoneField id={id} value={loginPhone} onChange={setLoginPhone} />
      </div>
    ) : (
      emailField(id)
    );

  /** E-posta mı telefon mu: giriş, kayıt, katılma ve şifremi unuttum ekranlarında */
  const methodPicker = (
    <div className="sort-options auth-method" role="radiogroup" aria-label={t("Giriş yöntemi")}>
      {(
        [
          ["email", t("E-posta")],
          ["phone", t("Telefon")],
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
            setInfo(null);
          }}
        >
          {label}
        </button>
      ))}
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
    <div className={`auth-page ${keyboardOpen ? "is-keyboard" : ""}`}>
      <form className="auth-card" onSubmit={submit} noValidate>
        <div className="auth-brand" aria-hidden="true">
          <img src="/logo.svg" alt="" />
        </div>
        <h1>Hesabım Muhasebe</h1>
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

        {(mode === "login" || mode === "register" || mode === "join" || mode === "forgot") && methodPicker}

        {mode === "login" && (
          <>
            {idField("auth-email-login")}
            {passwordField}
          </>
        )}

        {mode === "register" && (
          <>
            <div className="field">
              <label htmlFor="auth-business">{t("İşletme adı")}</label>
              <input id="auth-business" autoComplete="organization" value={business} onChange={(e) => setBusiness(e.target.value)} />
            </div>
            {idField("auth-email")}
            {method === "email" && (
              <div className="field">
                <label htmlFor="auth-phone">{t("Telefon (isteğe bağlı)")}</label>
                <PhoneField id="auth-phone" value={phone} onChange={setPhone} />
                {phone.trim() !== "" && !validPhone && <p className="field-hint">{t("Geçerli bir telefon numarası yazın.")}</p>}
              </div>
            )}
            {passwordField}
          </>
        )}

        {mode === "join" && (
          <>
            {idField("auth-email-join")}
            <div className="field">
              <label htmlFor="auth-owner">{t("Yetkilinin e-postası veya telefonu")}</label>
              <input
                id="auth-owner"
                type="text"
                inputMode="email"
                autoCapitalize="none"
                autoCorrect="off"
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
              />
            </div>
            {method === "email" && (
              <div className="field">
                <label htmlFor="auth-phone-join">{t("Telefon (isteğe bağlı)")}</label>
                <PhoneField id="auth-phone-join" value={phone} onChange={setPhone} />
                {phone.trim() !== "" && !validPhone && <p className="field-hint">{t("Geçerli bir telefon numarası yazın.")}</p>}
              </div>
            )}
            {passwordField}
          </>
        )}

        {mode === "owner" && (
          <>
            <p className="field-hint">{t("Hesabınız açıldı. Katılmak istediğiniz işletmenin yetkilisinin e-postasını kontrol edip tekrar deneyin.")}</p>
            <div className="field">
              <label htmlFor="auth-owner-again">{t("Yetkilinin e-postası veya telefonu")}</label>
              <input
                id="auth-owner-again"
                type="text"
                inputMode="email"
                autoCapitalize="none"
                autoCorrect="off"
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
              />
            </div>
          </>
        )}

        {(mode === "register" || mode === "join") && (
          <p className="field-hint auth-legal">
            {t("Kayıt olarak")}{gap}
            <a href={legalUrl("terms")} target="_blank" rel="noreferrer">{t("Kullanım koşulları")}</a>{gap}
            {t("ve")}{getLanguage() === "ar" ? "" : gap}
            <a href={legalUrl("privacy")} target="_blank" rel="noreferrer">{t("Gizlilik politikası")}</a>
            {/^[\p{L}\p{N}]/u.test(legalEnd) && !ATTACHED_END.includes(getLanguage()) ? " " : ""}
            {legalEnd}
          </p>
        )}

        {mode === "forgot" && idField("auth-email-reset")}

        {mode === "recovery" && passwordField}

        {error && <p className="form-error" role="alert">{error}</p>}
        {info && <p className="form-success" role="status">{info}</p>}
        {(mode === "code" || mode === "resetcode") && (
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
                  // Şifre sıfırlamada yeni giriş kodu, kayıtta yeni doğrulama kodu gönderilir
                  if (mode === "resetcode") await sendResetSms(pendingMail);
                  else await resendSignupCode(pendingMail);
                  setInfo(t("Yeni doğrulama kodu gönderildi."));
                } catch {
                  setError(t("Gönderilemedi; bağlantınızı kontrol edin."));
                }
              }}
            >
              {t("Kodu tekrar gönder")}
            </button>
            <button type="button" className="help-link" onClick={() => switchMode(mode === "resetcode" ? "login" : "register")}>
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
        {mode === "owner" && joinSession && (
          <button
            type="button"
            className="help-link"
            onClick={() => onSession(joinSession, { isNew: true, businessName: "" })}
          >
            {t("Bunun yerine kendi işletmemi açacağım")}
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
