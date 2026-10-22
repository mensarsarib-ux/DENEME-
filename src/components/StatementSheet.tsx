import { useEffect, useState } from "react";
import { haptic } from "../lib/haptics";
import { t } from "../lib/i18n";
import { createStatementPdf, type StatementInput, type StatementPdf } from "../lib/statement";

/**
 * Cari hesap ekstresi PDF'i: oluşturulur, sayfa sayfa önizlenir; paylaşılabilir, açılabilir ya da indirilebilir.
 */
export default function StatementSheet({
  input,
  onClose,
}: {
  input: StatementInput;
  onClose: () => void;
}) {
  const [pdf, setPdf] = useState<StatementPdf | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    let revoke: string | null = null;
    let cancelled = false;
    createStatementPdf(input)
      .then((result) => {
        if (cancelled) return;
        revoke = URL.createObjectURL(result.blob);
        setPdf(result);
        setUrl(revoke);
        haptic("success");
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
      if (revoke) URL.revokeObjectURL(revoke);
    };
    // Ekstre, sayfa açıldığı andaki veriyle bir kez üretilir
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const file = pdf ? new File([pdf.blob], pdf.filename, { type: "application/pdf" }) : null;
  const canShareFile = !!file && typeof navigator.canShare === "function" && navigator.canShare({ files: [file] });

  async function share() {
    if (!file) return;
    haptic("light");
    try {
      await navigator.share({ files: [file], title: input.party.name });
    } catch (error) {
      // Kullanıcı paylaşım penceresini kapattıysa sessizce geç
      if ((error as DOMException)?.name !== "AbortError") setNote(t("Paylaşım açılamadı; PDF'i açıp oradan paylaşabilirsiniz."));
    }
  }

  function open() {
    if (!url) return;
    haptic("light");
    const w = window.open(url, "_blank");
    if (!w) setNote(t("PDF bu pencerede açılamadı; İndir'i deneyin."));
  }

  function download() {
    if (!url || !pdf) return;
    haptic("light");
    const a = document.createElement("a");
    a.href = url;
    a.download = pdf.filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setNote(t("İndirme başlatıldı. Başlamazsa PDF'i açıp oradan kaydedin."));
  }

  return (
    <div className="action-backdrop" data-keep-keypad onClick={onClose}>
      <div
        className="action-sheet statement-sheet"
        role="dialog"
        aria-label={t("Cari hesap ekstresi")}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="action-handle" aria-hidden="true" />
        <h2 className="sheet-title">{t("Cari hesap ekstresi")}</h2>
        <p className="sheet-note">{input.party.name}</p>

        {!pdf && !failed && <p className="sheet-note">{t("PDF hazırlanıyor…")}</p>}
        {failed && <p className="form-error" role="alert">{t("PDF oluşturulamadı.")}</p>}

        {pdf && (
          <>
            <div className="statement-preview">
              {pdf.previews.map((src, i) => (
                <img key={i} src={src} alt={t("Sayfa {n} / {total}", { n: i + 1, total: pdf.previews.length })} />
              ))}
            </div>
            {canShareFile && (
              <button className="primary-btn" type="button" onClick={share}>
                {t("Paylaş / Kaydet")}
              </button>
            )}
            <div className="statement-actions">
              <button className="action-btn" type="button" onClick={open}>{t("PDF'i aç")}</button>
              <button className="action-btn" type="button" onClick={download}>{t("İndir")}</button>
            </div>
            {note && <p className="field-hint" role="status">{note}</p>}
          </>
        )}
        <button className="action-btn is-cancel" type="button" onClick={onClose}>
          {t("Kapat")}
        </button>
      </div>
    </div>
  );
}
