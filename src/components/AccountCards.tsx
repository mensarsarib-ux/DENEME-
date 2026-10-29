import { useEffect, useState, type FormEvent } from "react";
import {
  changePassword,
  CloudError,
  fetchPlan,
  getAccountProfile,
  updateAccountProfile,
  type Session,
} from "../lib/cloud";
import { CURRENT_PLAN, PLAN_NAME, type Plan } from "../lib/plan";
import { haptic } from "../lib/haptics";
import { locale, t } from "../lib/i18n";
import PhoneField from "./PhoneField";

/** Ayarlar → Hesabım: kişisel bilgiler, şifre değiştirme ve abonelik durumu */
export default function AccountCards({
  session,
  email,
  onOpenPlans,
  onExpired,
}: {
  session: Session;
  email: string;
  onOpenPlans: () => void;
  onExpired: () => void;
}) {
  return (
    <>
      <ProfileCard session={session} email={email} onExpired={onExpired} />
      <SubscriptionCard session={session} onOpenPlans={onOpenPlans} />
      <PasswordCard session={session} onExpired={onExpired} />
    </>
  );
}

/** Ad ve cep telefonu (hesabın bilgilerinde saklanır), e-posta ve doğrulandı işareti */
function ProfileCard({ session, email, onExpired }: { session: Session; email: string; onExpired: () => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saved, setSaved] = useState({ name: "", phone: "" });
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    let alive = true;
    getAccountProfile(session)
      .then((p) => {
        if (!alive) return;
        if (p === "expired") return onExpired();
        setName(p.name);
        setPhone(p.phone);
        setSaved({ name: p.name, phone: p.phone });
        setConfirmed(p.emailConfirmed);
      })
      .catch(() => alive && setMessage({ ok: false, text: t("Bilgiler yüklenemedi.") }));
    return () => {
      alive = false;
    };
    // Yalnızca sayfa açılınca okunur
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const changed = name.trim() !== saved.name || phone !== saved.phone;

  async function save(event: FormEvent) {
    event.preventDefault();
    if (busy || !changed) return;
    setBusy(true);
    setMessage(null);
    try {
      const r = await updateAccountProfile(session, name.trim(), phone);
      if (r === "expired") return onExpired();
      haptic("success");
      setSaved({ name: name.trim(), phone });
      setMessage({ ok: true, text: t("Bilgileriniz kaydedildi.") });
    } catch {
      haptic("warning");
      setMessage({ ok: false, text: t("Kaydedilemedi; bağlantınızı kontrol edin.") });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card" aria-label={t("Kullanıcı bilgileri")} onSubmit={save} noValidate>
      <h2 className="card-title">{t("Kullanıcı bilgileri")}</h2>
      <div className="field">
        <label htmlFor="acc-name">{t("Ad soyad")}</label>
        <input id="acc-name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="acc-phone">{t("Cep telefonu")}</label>
        <PhoneField id="acc-phone" value={phone} onChange={setPhone} />
      </div>
      <div className="field">
        <span className="field-label">{t("E-posta")}</span>
        <p className="account-email account-email-row">
          <span>{email}</span>
          {confirmed && (
            <span className="verified-badge" title={t("Doğrulandı")}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
              {t("Doğrulandı")}
            </span>
          )}
        </p>
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
