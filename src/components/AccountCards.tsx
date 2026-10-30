import { useEffect, useState, type FormEvent } from "react";
import {
  changePassword,
  CloudError,
  confirmEmailChange,
  fetchPlan,
  getAccountProfile,
  startAddEmail,
  normalizePhone,
  updateAccountProfile,
  type AccountProfile,
  type Session,
} from "../lib/cloud";
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
      const r = await updateAccountProfile(session, name.trim(), profile.phone);
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

/**
 * Giriş bilgileri: e-posta (doğrulanmış, girişin ana kimliği) ve telefon (telefonla girişte kullanılır).
 * Telefon SMS ile doğrulanmaz; kayıtlı numara ile giriş yapılır.
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

  const target = adding === "email" ? value.trim() : normalizePhone(value) ?? "";
  const valid = adding === "email" ? /^\S+@\S+\.\S+$/.test(target) : target !== "";

  function open(kind: "email" | "phone") {
    setAdding(kind);
    setValue(kind === "email" ? profile.loginEmail : profile.loginPhone);
    setCode("");
    setSentTo(null);
    setMessage(null);
  }

  async function send(event: FormEvent) {
    event.preventDefault();
    if (busy || !adding) return;
    setBusy(true);
    setMessage(null);
    try {
      if (adding === "phone") {
        // Telefon doğrulama kodu gerektirmez; numara hesabın bilgilerine yazılır
        if (!valid) return;
        const r = await updateAccountProfile(session, profile.name, target);
        if (r === "expired") return onExpired();
        haptic("success");
        setMessage({ ok: true, text: t("Telefon numaranız kaydedildi. Artık bu numara ve şifrenizle de giriş yapabilirsiniz.") });
        setAdding(null);
        onChanged();
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
          : t("Gönderilemedi; bağlantınızı kontrol edin."),
      });
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
          <span className="login-row-value">{profile.loginEmail}</span>
          {profile.emailConfirmed ? (
            <VerifiedBadge />
          ) : (
            <button type="button" className="action-btn" onClick={() => open("email")}>{t("Değiştir")}</button>
          )}
        </div>
      </div>
      <div className="field">
        <span className="field-label">{t("Telefon")}</span>
        <div className="login-row">
          <span className="login-row-value">{profile.loginPhone || t("Telefon eklenmedi")}</span>
          <button type="button" className="action-btn" onClick={() => open("phone")}>
            {profile.loginPhone ? t("Değiştir") : t("Telefon ekle")}
          </button>
        </div>
      </div>
      {adding && (
        <form className="login-add" onSubmit={send} noValidate>
          {adding === "phone" || !sentTo ? (
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
            </div>
          ) : (
            <div className="field">
              <label htmlFor="login-code">{t("{m} adresine 6 haneli bir doğrulama kodu gönderdik.", { m: sentTo })}</label>
              <input
                id="login-code"
                className="ob-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={8}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              />
            </div>
          )}
          <div className="card-actions">
            <button
              type="submit"
              className="action-btn"
              disabled={busy || (adding === "email" && sentTo ? !/^\d{6,8}$/.test(code) : !valid)}
            >
              {adding === "email" && sentTo ? t("DOĞRULA") : adding === "email" ? t("KOD GÖNDER") : t("KAYDET")}
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
