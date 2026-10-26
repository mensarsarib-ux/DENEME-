import { useState, type FormEvent } from "react";
import { CloudError, signIn } from "../lib/cloud";
import { t } from "../lib/i18n";
import { deleteWorkspace, listWorkspaces } from "../lib/storage";
import { leaveOrDeleteBusiness, loadSession } from "../lib/cloud";

/** Yerel işletmenin sunucudaki karşılığı (taşınmış ya da sunucudan açılmış ise) */
function localServerId(id: string): string | null {
  const w = listWorkspaces().find((x) => x.id === id);
  return w?.serverId ?? (w ? w.id : null);
}

/**
 * İşletme silme onayı: hesap e-postası ve şifre doğrulanmadan veri silinmez.
 * Doğrulama, bulut hesabına giriş yaparak yapılır.
 */
export default function DeleteBusinessDialog({
  id,
  name,
  onClose,
}: {
  id: string;
  name: string;
  onClose: () => void;
}) {
  const session = loadSession();
  const [email, setEmail] = useState(session?.email ?? "");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (!session) {
      setError(t("Silme için bu hesaba giriş yapmanız gerekir."));
      return;
    }
    if (email.trim().toLowerCase() !== session.email.toLowerCase()) {
      setError(t("E-posta hesabınızla eşleşmiyor."));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await signIn(email.trim(), password);
    } catch (e) {
      setBusy(false);
      setError(e instanceof CloudError && e.code === "invalid_credentials"
        ? t("E-posta veya şifre hatalı.")
        : t("Doğrulanamadı; bağlantınızı kontrol edin."));
      return;
    }
    // Sunucuda: üye ise yalnızca kendi üyeliği kalkar; sahip ise işletme sunucudan da silinir
    const serverId = localServerId(id);
    if (serverId) {
      try {
        const r = await leaveOrDeleteBusiness(session!, serverId);
        if (r === "expired") {
          setBusy(false);
          setError(t("Oturumunuz sona ermiş; yeniden giriş yapın."));
          return;
        }
      } catch {
        setBusy(false);
        setError(t("Sunucudan silinemedi; bağlantınızı kontrol edin."));
        return;
      }
    }
    deleteWorkspace(id);
    window.location.reload();
  }

  return (
    <div className="action-backdrop" onClick={onClose}>
      <form className="action-sheet" onSubmit={confirm} onClick={(e) => e.stopPropagation()} noValidate>
        <div className="sheet-handle" aria-hidden="true" />
        <h2 className="sheet-title">{t("“{n}” silinsin mi?", { n: name })}</h2>
        <p className="sheet-note">{t("Bu işletmenin tüm müşteri, işlem ve notları kalıcı olarak silinir. Onaylamak için hesap e-postası ve şifrenizi girin.")}</p>
        <div className="field">
          <label htmlFor="del-email">{t("E-posta")}</label>
          <input id="del-email" type="email" autoComplete="off" autoCapitalize="none" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="del-password">{t("Şifre")}</label>
          <input id="del-password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="danger-btn" type="submit" disabled={busy || !email || !password}>
          {busy ? t("Doğrulanıyor…") : t("Sil")}
        </button>
        <button type="button" className="help-link" onClick={onClose}>
          {t("Vazgeç")}
        </button>
      </form>
    </div>
  );
}
