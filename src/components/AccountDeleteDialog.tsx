import { useEffect, useState, type FormEvent } from "react";
import { CloudError, ownerCheckCode, ownerInfo, ownerSendCode, signIn, type Session } from "../lib/cloud";
import { t } from "../lib/i18n";
import { onAndroid } from "../lib/platform";

/**
 * Hesap silme / veri sıfırlama onayı.
 * - Telefonla açılmış hesapta (hesabın kayıtlı numarası varsa): numaraya WhatsApp'tan gelen kod istenir.
 * - Diğer hesaplarda: hesap şifresi, e-postasıyla giriş denenerek kontrol edilir.
 * Onay olmadan onConfirm çağrılmaz.
 */
export default function AccountDeleteDialog({
  email,
  session,
  onConfirm,
  onClose,
  title = t("Hesabınızı silmek için şifrenizi girin"),
  note = onAndroid() ? t("Hesabınız ve bu hesaba bağlı tüm veriler kalıcı olarak silinecek. Bu işlem geri alınamaz. Aktif bir paket aboneliğiniz varsa hesabı silmek aboneliği iptal etmez; iptal için Google Play → Profil → Ödemeler ve abonelikler → Abonelikler bölümünü kullanın.") : t("Hesabınız ve bu hesaba bağlı tüm veriler kalıcı olarak silinecek. Bu işlem geri alınamaz. Aktif bir paket aboneliğiniz varsa hesabı silmek aboneliği iptal etmez; iptal için iPhone'da Ayarlar → Apple Hesabı → Abonelikler bölümünü kullanın."),
  actionLabel = t("Hesabımı sil"),
}: {
  email: string;
  /** Oturum verilirse ve hesabın numarası varsa WhatsApp kodu ile onaylanır */
  session?: Session;
  onConfirm: () => void;
  onClose: () => void;
  /** Pencerenin başlığı, açıklaması ve onay düğmesinin metni */
  title?: string;
  note?: string;
  actionLabel?: string;
}) {
  const [mode, setMode] = useState<"loading" | "password" | "phone">(session ? "loading" : "password");
  const [masked, setMasked] = useState("");
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    let alive = true;
    void ownerInfo(session)
      .then((r) => {
        if (!alive) return;
        if (r === "expired") {
          setError(t("Oturumunuz sona ermiş; yeniden giriş yapıp tekrar deneyin."));
          setMode("password");
          return;
        }
        if (r.hasPhone && r.masked) {
          setMasked(r.masked);
          setMode("phone");
        } else {
          setMode("password");
        }
      })
      .catch(() => {
        if (alive) setMode("password");
      });
    return () => {
      alive = false;
    };
  }, [session]);

  async function sendCode() {
    if (busy || !session) return;
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const r = await ownerSendCode(session);
      if (r === "expired") {
        setError(t("Oturumunuz sona ermiş; yeniden giriş yapıp tekrar deneyin."));
        return;
      }
      if (r !== true) {
        setError(
          r.error === "wait"
            ? t("Bu numaraya az önce kod gönderdik. Yeni kod için {m} dakika bekleyin.", { m: Math.max(1, Math.ceil((r.seconds ?? 60) / 60)) })
            : r.error === "hourly"
              ? t("Bu numaraya bir saatte en fazla 3 kod gönderilebilir. Biraz sonra tekrar deneyin.")
              : t("Kod gönderilemedi; bağlantınızı kontrol edip tekrar deneyin."),
        );
        return;
      }
      setSent(true);
      setInfo(t("{p} numarasına WhatsApp ile 6 haneli bir kod gönderdik.", { p: masked }));
    } finally {
      setBusy(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (mode === "phone") {
      if (!session || !/^\d{6}$/.test(code)) return;
      setBusy(true);
      setError(null);
      try {
        const r = await ownerCheckCode(session, code);
        if (r === "expired") {
          setError(t("Oturumunuz sona ermiş; yeniden giriş yapıp tekrar deneyin."));
          return;
        }
        if (r === "invalid") {
          setError(t("Kod hatalı ya da süresi dolmuş. Yeni kod isteyin."));
          return;
        }
      } finally {
        setBusy(false);
      }
      onConfirm();
      return;
    }
    if (!password) return;
    setBusy(true);
    setError(null);
    try {
      await signIn(email, password);
    } catch (e) {
      setBusy(false);
      setError(
        e instanceof CloudError && e.code === "invalid_credentials"
          ? t("Şifre hatalı.")
          : t("Doğrulanamadı; bağlantınızı kontrol edin."),
      );
      return;
    }
    onConfirm();
  }

  return (
    <div className="action-backdrop is-high" onClick={onClose}>
      <form className="action-sheet" onSubmit={submit} onClick={(e) => e.stopPropagation()} noValidate>
        <div className="sheet-handle" aria-hidden="true" />
        <h2 className="sheet-title">{mode === "phone" ? title.replace(/şifrenizi girin/i, t("kodu girin")) : title}</h2>
        <p className="sheet-note">{note}</p>

        {mode === "loading" && <p className="sheet-note">{t("Yükleniyor…")}</p>}

        {mode === "phone" && (
          <>
            {!sent ? (
              <button type="button" className="action-btn" onClick={() => void sendCode()} disabled={busy}>
                {busy ? t("Gönderiliyor…") : t("Kodu WhatsApp'a gönder ({p})", { p: masked })}
              </button>
            ) : (
              <>
                {info && <p className="sheet-note">{info}</p>}
                <div className="field">
                  <label htmlFor="acc-del-code">{t("6 haneli kod")}</label>
                  <input
                    id="acc-del-code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  />
                </div>
                <button className="danger-btn" type="submit" disabled={busy || code.length !== 6}>
                  {busy ? t("Doğrulanıyor…") : actionLabel}
                </button>
                <button type="button" className="help-link" onClick={() => void sendCode()} disabled={busy}>
                  {t("Kodu tekrar gönder")}
                </button>
              </>
            )}
          </>
        )}

        {mode === "password" && (
          <>
            <div className="field">
              <label htmlFor="acc-del-password">{t("Şifre")}</label>
              <input
                id="acc-del-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button className="danger-btn" type="submit" disabled={busy || !password}>
              {busy ? t("Doğrulanıyor…") : actionLabel}
            </button>
          </>
        )}

        {error && <p className="form-error" role="alert">{error}</p>}
        <button type="button" className="help-link" onClick={onClose}>
          {t("Vazgeç")}
        </button>
      </form>
    </div>
  );
}
