import { useEffect, useState, type FormEvent } from "react";
import {
  changePassword,
  CloudError,
  confirmEmailChange,
  confirmEmailVerify,
  sendEmailVerifyCode,
  fetchPlan,
  getAccountProfile,
  startAddEmail,
  normalizePhone,
  updateAccountProfile,
  type AccountProfile,
  type Session,
  attachVerifiedPhone,
} from "../lib/cloud";
import { confirmSmsCode, resendWait, sendSmsCode, smsErrorText } from "../lib/phoneVerify";
import { CURRENT_PLAN, PLAN_NAME, type Plan } from "../lib/plan";
import { haptic } from "../lib/haptics";
import { locale, t } from "../lib/i18n";
import PhoneField from "./PhoneField";

/** Ayarlar → Hesabım: kişisel bilgiler, şifre değiştirme ve abonelik durumu */
export default function AccountCards({
  session,
  onOpenPlans,
  onExpired,
}: {
  session: Session;
  onOpenPlans: () => void;
  onExpired: () => void;
}) {
  return (
    <>
      <ProfileCard session={session} onExpired={onExpired} />
      <SubscriptionCard session={session} onOpenPlans={onOpenPlans} />
      <PasswordCard session={session} onExpired={onExpired} />
    </>
  );
}

/** Ad soyad ve giriş bilgileri (e-posta ve telefon, doğrulandı işaretiyle; eksik olan eklenip doğrulanabilir) */
function ProfileCard({ session, onExpired }: { session: Session; onExpired: () => void }) {
  const [name, setName] = useState("");
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  function load() {
    return getAccountProfile(session).then((p) => {
      if (p === "expired") return onExpired();
      setProfile(p);
      setName((current) => current || p.name);
    });
  }

  useEffect(() => {
    load().catch(() => setMessage({ ok: false, text: t("Bilgiler yüklenemedi.") }));
    // Yalnızca sayfa açılınca okunur
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const changed = profile !== null && name.trim() !== profile.name;

  async function save(event: FormEvent) {
    event.preventDefault();
    if (busy || !changed || !profile) return;
    setBusy(true);
    setMessage(null);
    try {
      const r = await updateAccountProfile(session, name.trim());
      if (r === "expired") return onExpired();
      haptic("success");
      setProfile({ ...profile, name: name.trim() });
      setMessage({ ok: true, text: t("Bilgileriniz kaydedildi.") });
    } catch {
      haptic("warning");
      setMessage({ ok: false, text: t("Kaydedilemedi; bağlantınızı kontrol edin.") });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <form className="card" aria-label={t("Kullanıcı bilgileri")} onSubmit={save} noValidate>
        <h2 className="card-title">{t("Kullanıcı bilgileri")}</h2>
        <div className="field">
          <label htmlFor="acc-name">{t("Ad soyad")}</label>
          <input id="acc-name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="card-actions">
          <button type="submit" className="action-btn" disabled={busy || !changed}>
            {busy ? t("Kaydediliyor…") : t("Kaydet")}
          </button>
        </div>
        {message && (
          <p className={`field-hint ${message.ok ? "" : "is-error"}`} role="status">
            {message.text}
          </p>
        )}
      </form>
      {profile && <LoginCard session={session} profile={profile} onChanged={() => void load()} onExpired={onExpired} />}
    </>
  );
}

/** Doğrulandı işareti */
function VerifiedBadge() {
  return (
    <span className="verified-badge" title={t("Doğrulandı")}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 12.5l4.5 4.5L19 7.5" />
      </svg>
      {t("Doğrulandı")}
    </span>
  );
}

/** Doğrulanmadı işareti (telefon); basınca doğrulama başlar */
function UnverifiedBadge({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="verified-badge is-unverified" onClick={onClick}>
      {t("Doğrulanmadı")}
    </button>
  );
}

/**
 * Giriş bilgileri: e-posta (doğrulanmış, girişin ana kimliği) ve telefon (telefonla girişte kullanılır).
 * Telefon SMS koduyla doğrulanır; doğrulanmamış numaranın yanında "Doğrulanmadı" yazar, basınca kod gönderilir.
 */
function LoginCard({
  session,
  profile,
  onChanged,
  onExpired,
}: {
  session: Session;
  profile: AccountProfile;
  onChanged: () => void;
  onExpired: () => void;
}) {
  const [adding, setAdding] = useState<"email" | "phone" | null>(null);
  const [value, setValue] = useState("");
  const [code, setCode] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  // SMS kodu tekrar istenebilene kadar kalan süre (sn)
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = window.setTimeout(() => setResendIn((n) => n - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [resendIn]);

  const target = adding === "email" ? value.trim() : normalizePhone(value) ?? "";
  const valid = adding === "email" ? /^\S+@\S+\.\S+$/.test(target) : target !== "";

  function open(kind: "email" | "phone") {
    setAdding(kind);
    setValue(kind === "email" ? profile.loginEmail : profile.phone);
    setCode("");
    setSentTo(null);
    setMessage(null);
  }

  /** Numaraya SMS kodu gönderir ve kod alanını açar */
  async function sendSms(phone: string) {
    await sendSmsCode(phone, (idToken) =>
      void finishPhone(idToken).catch((e: unknown) => {
        haptic("warning");
        setMessage({
          ok: false,
          text:
            e instanceof CloudError && e.code === "phone_taken"
              ? t("Bu telefon numarası başka bir hesapta kullanılıyor.")
              : t("Gönderilemedi; bağlantınızı kontrol edin."),
        });
      }),
    );
    haptic("success");
    setSentTo(phone);
    setCode("");
    setResendIn(await resendWait(phone));
  }

  /** Kod doğrulandı: numara hesaba doğrulanmış olarak yazılır */
  async function finishPhone(idToken: string) {
    const r = await attachVerifiedPhone(session, idToken);
    if (r === "expired") return onExpired();
    haptic("success");
    setMessage({ ok: true, text: t("Telefon numaranız doğrulandı. Bu numara ve şifrenizle de giriş yapabilirsiniz.") });
    setAdding(null);
    setSentTo(null);
    onChanged();
  }

  /** Kayıtlı ama doğrulanmamış numarayı doğrular */
  async function verifyExisting() {
    if (busy) return;
    setAdding("phone");
    setValue(profile.phone);
    setMessage(null);
    setBusy(true);
    try {
      await sendSms(profile.phone);
    } catch (e) {
      haptic("warning");
      setMessage({ ok: false, text: smsErrorText(e) });
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    if (!sentTo || resendIn > 0 || busy) return;
    setBusy(true);
    setMessage(null);
    try {
      await sendSms(sentTo);
    } catch (e) {
      haptic("warning");
      setMessage({ ok: false, text: smsErrorText(e) });
    } finally {
      setBusy(false);
    }
  }

  async function send(event: FormEvent) {
    event.preventDefault();
    if (busy || !adding) return;
    setBusy(true);
    setMessage(null);
    try {
      if (adding === "phone") {
        if (!sentTo) {
          if (!valid) return;
          await sendSms(target);
        } else {
          const idToken = await confirmSmsCode(code);
          await finishPhone(idToken);
        }
        return;
      }
      if (!sentTo) {
        if (!valid) return;
        const r = await startAddEmail(session, target);
        if (r === "expired") return onExpired();
        haptic("success");
        setSentTo(target);
      } else {
        const r = await confirmEmailChange(session, sentTo, code);
        if (r === "expired") return onExpired();
        if (!r) {
          haptic("warning");
          setMessage({ ok: false, text: t("Kod hatalı ya da süresi dolmuş. Yeni kod isteyin.") });
          return;
        }
        haptic("success");
        setMessage({ ok: true, text: t("E-postanız değiştirildi ve doğrulandı.") });
        setAdding(null);
        onChanged();
      }
    } catch (e) {
      haptic("warning");
      setMessage({
        ok: false,
        text: e instanceof CloudError && e.code === "email_taken"
          ? t("Bu e-posta başka bir hesapta kullanılıyor.")
          : e instanceof CloudError && e.code === "phone_taken"
            ? t("Bu telefon numarası başka bir hesapta kullanılıyor.")
            : e instanceof CloudError
              ? t("Gönderilemedi; bağlantınızı kontrol edin.")
              : smsErrorText(e),
      });
    } finally {
      setBusy(false);
    }
  }

  const codeStep = !!sentTo;

  // E-posta doğrulaması (menüden, isteğe bağlı): kayıtta e-posta kodu istenmez
  const [emailCodeSent, setEmailCodeSent] = useState(false);
  const [emailCode, setEmailCode] = useState("");

  async function startEmailVerify() {
    if (busy || !profile.loginEmail) return;
    setAdding(null);
    setBusy(true);
    setMessage(null);
    try {
      await sendEmailVerifyCode(profile.loginEmail);
      haptic("success");
      setEmailCode("");
      setEmailCodeSent(true);
    } catch {
      haptic("warning");
      setMessage({ ok: false, text: t("Kod gönderilemedi. Biraz bekleyip tekrar deneyin.") });
    } finally {
      setBusy(false);
    }
  }

  async function finishEmailVerify(event: FormEvent) {
    event.preventDefault();
    if (busy || !/^\d{6,8}$/.test(emailCode)) return;
    setBusy(true);
    setMessage(null);
    try {
      const ok = await confirmEmailVerify(profile.loginEmail, emailCode);
      if (!ok) {
        haptic("warning");
        setMessage({ ok: false, text: t("Kod hatalı ya da süresi dolmuş. Yeni kod isteyin.") });
        return;
      }
      haptic("success");
      setEmailCodeSent(false);
      setMessage({ ok: true, text: t("E-postanız doğrulandı.") });
      onChanged();
    } catch {
      setMessage({ ok: false, text: t("Gönderilemedi; bağlantınızı kontrol edin.") });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card" aria-label={t("Giriş bilgileri")}>
      <h2 className="card-title">{t("Giriş bilgileri")}</h2>
      <div className="field">
        <span className="field-label">{t("E-posta")}</span>
        <div className="login-row">
          <span className="login-row-value">{profile.loginEmail || t("E-posta eklenmedi")}</span>
          {/* Telefonla açılan hesapta e-posta yoktur: isteğe bağlı eklenir */}
          {!profile.loginEmail ? (
            <button type="button" className="action-btn" onClick={() => open("email")}>{t("E-posta ekle")}</button>
          ) : profile.emailConfirmed ? (
            <VerifiedBadge />
          ) : (
            <>
              <UnverifiedBadge onClick={() => void startEmailVerify()} />
              <button type="button" className="action-btn" onClick={() => open("email")}>{t("Değiştir")}</button>
            </>
          )}
        </div>
      </div>
      {emailCodeSent && (
        <form className="login-add" onSubmit={finishEmailVerify} noValidate>
          <div className="field">
            <label htmlFor="email-verify-code">{t("{m} adresine 6 haneli bir doğrulama kodu gönderdik.", { m: profile.loginEmail })}</label>
            <input
              id="email-verify-code"
              className="ob-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={8}
              value={emailCode}
              onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, ""))}
            />
            <p className="field-hint">{t("Mail gelmediyse spam ya da gereksiz klasörüne bakın.")}</p>
          </div>
          <div className="card-actions">
            <button type="submit" className="action-btn" disabled={busy || !/^\d{6,8}$/.test(emailCode)}>
              {busy ? t("Bekleyin…") : t("DOĞRULA")}
            </button>
            <button type="button" className="help-link" onClick={() => setEmailCodeSent(false)}>
              {t("Vazgeç")}
            </button>
          </div>
        </form>
      )}
      <div className="field">
        <span className="field-label">{t("Telefon")}</span>
        <div className="login-row">
          <span className="login-row-value">{profile.phone || t("Telefon eklenmedi")}</span>
          {profile.phone && (profile.phoneVerified ? <VerifiedBadge /> : <UnverifiedBadge onClick={() => void verifyExisting()} />)}
          <button type="button" className="action-btn" onClick={() => open("phone")}>
            {profile.phone ? t("Değiştir") : t("Telefon ekle")}
          </button>
        </div>
      </div>
      {adding && (
        <form className="login-add" onSubmit={send} noValidate>
          {!codeStep ? (
            <div className="field">
              <label htmlFor="login-add">{adding === "email" ? t("Yeni e-posta") : t("Telefon")}</label>
              {adding === "email" ? (
                <input
                  id="login-add"
                  type="email"
                  inputMode="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                />
              ) : (
                <PhoneField id="login-add" value={value} onChange={setValue} />
              )}
              {adding === "phone" && <p className="field-hint">{t("Numaranıza SMS ile 6 haneli bir kod göndereceğiz.")}</p>}
            </div>
          ) : (
            <div className="field">
              <label htmlFor="login-code">
                {adding === "phone"
                  ? t("{p} numarasına SMS ile 6 haneli bir kod gönderdik.", { p: sentTo })
                  : t("{m} adresine 6 haneli bir doğrulama kodu gönderdik.", { m: sentTo })}
              </label>
              <input
                id="login-code"
                className="ob-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={8}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              />
              {adding === "phone" && (
                <button type="button" className="help-link" disabled={resendIn > 0 || busy} onClick={() => void resend()}>
                  {resendIn > 0
                    ? t("Kodu tekrar gönder ({s} sn)", { s: resendIn })
                    : t("Kodu tekrar gönder")}
                </button>
              )}
            </div>
          )}
          <div className="card-actions">
            <button type="submit" className="action-btn" disabled={busy || (codeStep ? !/^\d{6,8}$/.test(code) : !valid)}>
              {busy ? t("Bekleyin…") : codeStep ? t("DOĞRULA") : t("KOD GÖNDER")}
            </button>
            <button type="button" className="help-link" onClick={() => setAdding(null)}>
              {t("Vazgeç")}
            </button>
          </div>
        </form>
      )}
      {message && (
        <p className={`field-hint ${message.ok ? "" : "is-error"}`} role="status">
          {message.text}
        </p>
      )}
    </section>
  );
}

/** Abonelik: paket adı, bitiş tarihi, kalan gün; paketlere ve App Store abonelik yönetimine bağlantı */
function SubscriptionCard({ session, onOpenPlans }: { session: Session; onOpenPlans: () => void }) {
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [plan, setPlan] = useState<Plan>(CURRENT_PLAN);

  useEffect(() => {
    let alive = true;
    fetchPlan(session)
      .then((r) => {
        if (!alive || !r || r === "expired") return;
        if (r.plan === "pro" || r.plan === "proplus" || r.plan === "premium" || r.plan === "free") setPlan(r.plan);
        setExpiresAt(r.plan === "free" ? null : r.expiresAt);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [session]);

  const end = expiresAt ? new Date(expiresAt) : null;
  const daysLeft = end ? Math.max(0, Math.ceil((end.getTime() - Date.now()) / 86_400_000)) : null;

  return (
    <section className={`card subscription-card ${plan !== "free" ? "is-paid" : ""}`} aria-label={t("Abonelik")}>
      <h2 className="card-title">{t("Abonelik")}</h2>
      <p className="subscription-plan">
        {plan !== "free" && (
          <svg className="subscription-crown" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z" />
          </svg>
        )}
        {t(PLAN_NAME[plan])}
      </p>
      <p className="card-empty">
        {end && daysLeft !== null
          ? t("{p} aboneliğiniz {date} tarihinde yenilenir ya da sona erer ({n} gün kaldı).", {
              p: t(PLAN_NAME[plan]),
              date: end.toLocaleDateString(locale(), { day: "numeric", month: "long", year: "numeric" }),
              n: daysLeft,
            })
          : t("Ücretsiz paketi kullanıyorsunuz.")}
      </p>
      <div className="card-actions">
        <button type="button" className="action-btn" onClick={onOpenPlans}>
          {plan === "premium" ? t("Paketler") : t("Üst pakete geç")}
        </button>
        {plan !== "free" && (
          <a className="action-btn" href="https://apps.apple.com/account/subscriptions" target="_blank" rel="noreferrer">
            {t("Aboneliği yönet")}
          </a>
        )}
      </div>
    </section>
  );
}

/** Şifre değiştirme: mevcut şifre, yeni şifre ve tekrarı */
function PasswordCard({ session, onExpired }: { session: Session; onExpired: () => void }) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (next.length < 6) return setMessage({ ok: false, text: t("Yeni şifre en az 6 karakter olmalı.") });
    if (next !== again) return setMessage({ ok: false, text: t("Yeni şifreler aynı değil.") });
    setBusy(true);
    setMessage(null);
    try {
      const r = await changePassword(session, current, next);
      if (r === "expired") return onExpired();
      haptic("success");
      setCurrent("");
      setNext("");
      setAgain("");
      setOpen(false);
      setMessage({ ok: true, text: t("Şifreniz değiştirildi.") });
    } catch (e) {
      haptic("warning");
      const code = e instanceof CloudError ? e.code : "unknown";
      setMessage({
        ok: false,
        text:
          code === "invalid_credentials"
            ? t("Mevcut şifre hatalı.")
            : code === "weak_password"
              ? t("Yeni şifre çok zayıf; daha uzun bir şifre seçin.")
              : code === "same_password"
                ? t("Yeni şifre eskisiyle aynı olamaz.")
                : t("Şifre değiştirilemedi; bağlantınızı kontrol edin."),
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card" aria-label={t("Şifre")}>
      <h2 className="card-title">{t("Şifre")}</h2>
      {!open ? (
        <div className="card-actions">
          <button
            type="button"
            className="action-btn"
            onClick={() => {
              setMessage(null);
              setOpen(true);
            }}
          >
            {t("Şifreyi değiştir")}
          </button>
        </div>
      ) : (
        <form onSubmit={submit} noValidate>
          <div className="field">
            <label htmlFor="pw-current">{t("Mevcut şifre")}</label>
            <input id="pw-current" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="pw-next">{t("Yeni şifre")}</label>
            <input id="pw-next" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="pw-again">{t("Yeni şifre (tekrar)")}</label>
            <input id="pw-again" type="password" autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} />
          </div>
          <div className="card-actions">
            <button type="button" className="action-btn" onClick={() => setOpen(false)} disabled={busy}>
              {t("Vazgeç")}
            </button>
            <button type="submit" className="action-btn" disabled={busy || !current || !next || !again}>
              {busy ? t("Kaydediliyor…") : t("Kaydet")}
            </button>
          </div>
        </form>
      )}
      {message && (
        <p className={`field-hint ${message.ok ? "" : "is-error"}`} role="status">
          {message.text}
        </p>
      )}
    </section>
  );
}
