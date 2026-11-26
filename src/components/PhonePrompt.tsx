import { useState, type FormEvent } from "react";
import { CloudError, attachVerifiedPhone, sendWaCode, type Session } from "../lib/cloud";
import { t } from "../lib/i18n";
import PhoneField from "./PhoneField";

/** Telefon numarası doğrulanmamış hesaplara gösterilen, vazgeçilebilir doğrulama ekranı */
export default function PhonePrompt({
  session,
  onDone,
  onLater,
}: {
  session: Session;
  onDone: () => void;
  /** Bugün için kapat; yarın tekrar gösterilir */
  onLater: () => void;
}) {
  const [phone, setPhone] = useState("");
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function sendCode(event?: FormEvent) {
    event?.preventDefault();
    if (busy || !/^\+\d{8,15}$/.test(phone)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await sendWaCode(phone);
      if (res.ok) {
        setSent(true);
        setInfo(t("{p} numarasına WhatsApp ile 6 haneli bir kod gönderdik.", { p: phone }));
        return;
      }
      const body = (await res.json().catch(() => ({}))) as { error?: string; seconds?: number };
      if (res.status === 429 && body.error === "hourly") {
        setError(t("Bu numaraya bir saatte en fazla 3 kod gönderilebilir. Biraz sonra tekrar deneyin."));
      } else if (res.status === 429) {
        setError(t("Bu numaraya az önce kod gönderdik. Yeni kod için {m} dakika bekleyin.", { m: Math.max(1, Math.ceil((body.seconds ?? 60) / 60)) }));
      } else {
        setError(t("Kod gönderilemedi; bağlantınızı kontrol edip tekrar deneyin."));
      }
    } catch {
      setError(t("Sunucuya ulaşılamadı."));
    } finally {
      setBusy(false);
    }
  }

  async function verify(event: FormEvent) {
    event.preventDefault();
    if (busy || !/^\d{6}$/.test(code)) return;
    setBusy(true);
    setError(null);
    try {
      const r = await attachVerifiedPhone(session, `wa:${phone}:${code}`);
      if (r === "expired") {
        setError(t("Oturumunuz sona ermiş; yeniden giriş yapıp tekrar deneyin."));
        return;
      }
      onDone();
    } catch (e) {
      setError(
        e instanceof CloudError && e.code === "phone_taken"
          ? t("Bu telefon numarası başka bir hesapta kayıtlı.")
          : e instanceof CloudError && e.code === "invalid_credentials"
            ? t("Kod hatalı ya da süresi dolmuş. Yeni kod isteyin.")
            : t("Doğrulanamadı; bağlantınızı kontrol edip tekrar deneyin."),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="action-backdrop is-high" onClick={onLater}>
      <div className="action-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" aria-hidden="true" />
        <h2 className="sheet-title">{t("Telefon numaranızı doğrulayın")}</h2>
        <p className="sheet-note">
          {t("Verilerinizi daha güvende tutmak için telefon numaranızı doğrulayın. Doğrulama WhatsApp ile 6 haneli bir kodla yapılır.")}
        </p>

        {!sent ? (
          <form onSubmit={sendCode} noValidate>
            <div className="field">
              <label htmlFor="pp-phone">{t("Telefon")}</label>
              <PhoneField id="pp-phone" value={phone} onChange={setPhone} />
            </div>
            <button className="action-btn" type="submit" disabled={busy || !/^\+\d{8,15}$/.test(phone)}>
              {busy ? t("Gönderiliyor…") : t("KOD GÖNDER")}
            </button>
          </form>
        ) : (
          <form onSubmit={verify} noValidate>
            {info && <p className="sheet-note">{info}</p>}
            <div className="field">
              <label htmlFor="pp-code">{t("6 haneli kod")}</label>
              <input
                id="pp-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              />
            </div>
            <button className="action-btn" type="submit" disabled={busy || code.length !== 6}>
              {busy ? t("Doğrulanıyor…") : t("DOĞRULA")}
            </button>
            <button type="button" className="help-link" onClick={() => void sendCode()} disabled={busy}>
              {t("Kodu tekrar gönder")}
            </button>
          </form>
        )}

        {error && <p className="form-error" role="alert">{error}</p>}
        <button type="button" className="help-link" onClick={onLater}>
          {t("Şimdilik vazgeç")}
        </button>
      </div>
    </div>
  );
}

/** Bugün için "Şimdilik vazgeç" denildi mi (günde bir kez hatırlatma) */
export function phonePromptDismissedToday(): boolean {
  try {
    return localStorage.getItem("hesabim:phone-prompt-day") === new Date().toDateString();
  } catch {
    return false;
  }
}

export function markPhonePromptDismissed(): void {
  try {
    localStorage.setItem("hesabim:phone-prompt-day", new Date().toDateString());
  } catch {
    /* yoksayılır */
  }
}
