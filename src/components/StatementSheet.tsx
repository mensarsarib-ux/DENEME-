import { useEffect, useState } from "react";
import { haptic } from "../lib/haptics";
import { t } from "../lib/i18n";
import { saveViaViewer } from "../lib/saveFile";
import WheelDate, { todayIso } from "./WheelDate";
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
  // Dönem seçimi: önce seçilir, sonra PDF üretilir
  const [mode, setMode] = useState<"all" | "from" | "between">("all");
  const [from, setFrom] = useState(todayIso);
  const [to, setTo] = useState(todayIso);
  const [range, setRange] = useState<{ from?: string; to?: string } | null>(null);

  const canBuild =
    mode === "all" ||
    mode === "from" ||
    (mode === "between" && from <= to);

  useEffect(() => {
    if (!range) return;
    let revoke: string | null = null;
    let cancelled = false;
    setPdf(null);
    setUrl(null);
    setFailed(false);
    createStatementPdf({ ...input, range })
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  function build() {
    haptic("light");
    setNote(null);
    setRange(
      mode === "all"
        ? {}
        : mode === "from"
          ? { from }
          : { from, to },
    );
  }

  const file = pdf ? new File([pdf.blob], pdf.filename, { type: "application/pdf" }) : null;
  const canShareFile = !!file && typeof navigator.canShare === "function" && navigator.canShare({ files: [file] });

  /**
   * Paylaş / Kaydet: önce Claude'un dosya kaydetme penceresi (iOS uygulamasında paylaşım sayfası),
   * olmazsa tarayıcının paylaşımı, o da olmazsa indirme bağlantısı.
   */
  async function share() {
    if (!file || !pdf || !url) return;
    haptic("light");
    const viewer = await saveViaViewer(pdf.filename, pdf.blob);
    if (viewer !== "unavailable") return;
    if (canShareFile) {
      try {
        await navigator.share({ files: [file], title: input.party.name });
        return;
      } catch (error) {
        if ((error as DOMException)?.name === "AbortError") return;
      }
    }
    const a = document.createElement("a");
    a.href = url;
    a.download = pdf.filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setNote(t("İndirme başlatıldı. Başlamazsa PDF'i açıp oradan kaydedin."));
  }

  function open() {
    if (!url) return;
    haptic("light");
    const w = window.open(url, "_blank");
    if (!w) setNote(t("PDF bu pencerede açılamadı; Paylaş / Kaydet'i deneyin."));
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

        {!range && (
          <>
            <div className="kasa-options">
              {(
                [
                  ["all", t("Tüm hareketler")],
                  ["from", t("Belirli bir tarihten itibaren")],
                  ["between", t("Tarih aralığı")],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={`action-btn ${mode === value ? "is-active" : ""}`}
                  aria-pressed={mode === value}
                  onClick={() => setMode(value)}
                >
                  {label}
                </button>
              ))}
            </div>
            {mode !== "all" && (
              <div className="kasa-range wheel-block">
                <span className="wheel-caption">{mode === "from" ? t("Başlangıç tarihi") : t("Başlangıç")}</span>
                <WheelDate value={from} onChange={setFrom} />
                {mode === "between" && (
                  <>
                    <span className="wheel-caption">{t("Bitiş")}</span>
                    <WheelDate value={to} onChange={setTo} />
                  </>
                )}
              </div>
            )}
            <button className="primary-btn" type="button" disabled={!canBuild} onClick={build}>
              {t("PDF'i oluştur")}
            </button>
          </>
        )}

        {range && !pdf && !failed && <p className="sheet-note">{t("PDF hazırlanıyor…")}</p>}
        {failed && <p className="form-error" role="alert">{t("PDF oluşturulamadı.")}</p>}

        {pdf && (
          <>
            <div className="statement-preview">
              {pdf.previews.map((src, i) => (
                <img key={i} src={src} alt={t("Sayfa {n} / {total}", { n: i + 1, total: pdf.previews.length })} />
              ))}
            </div>
            <button className="primary-btn" type="button" onClick={share}>
              {t("Paylaş / Kaydet")}
            </button>
            <button className="action-btn" type="button" onClick={open}>{t("PDF'i aç")}</button>
            <button className="action-btn" type="button" onClick={() => { setRange(null); setPdf(null); setUrl(null); }}>
              {t("Dönemi değiştir")}
            </button>
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
