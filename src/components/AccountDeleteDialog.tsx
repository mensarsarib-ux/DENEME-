import { useState, type FormEvent } from "react";
import { CloudError, signIn } from "../lib/cloud";
import { t } from "../lib/i18n";

/**
 * Hesap silme onayı: hesap şifresi doğrulanmadan hesap silinmez.
 * Şifre, hesap e-postasıyla giriş denenerek kontrol edilir.
 */
export default function AccountDeleteDialog({
  email,
  onConfirm,
  onClose,
  title = t("Hesabınızı silmek için şifrenizi girin"),
  note = t("Hesabınız ve bu hesaba bağlı tüm veriler kalıcı olarak silinecek. Bu işlem geri alınamaz. Aktif bir paket aboneliğiniz varsa hesabı silmek aboneliği iptal etmez; iptal için iPhone'da Ayarlar → Apple Hesabı → Abonelikler bölümünü kullanın."),
  actionLabel = t("Hesabımı sil"),
}: {
  email: string;
  onConfirm: () => void;
  onClose: () => void;
  /** Pencerenin başlığı, açıklaması ve onay düğmesinin metni */
  title?: string;
  note?: string;
  actionLabel?: string;
}) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || !password) return;
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
        <h2 className="sheet-title">{title}</h2>
        <p className="sheet-note">{note}</p>
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
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="danger-btn" type="submit" disabled={busy || !password}>
          {busy ? t("Doğrulanıyor…") : actionLabel}
        </button>
        <button type="button" className="help-link" onClick={onClose}>
          {t("Vazgeç")}
        </button>
      </form>
    </div>
  );
}
