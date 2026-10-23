import { useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import type { Period } from "../data/mock";
import { haptic } from "../lib/haptics";
import { fromDateInput, toDateInput, type RangeMode } from "../lib/ranges";
import { t } from "../lib/i18n";
import { Svg } from "./Icon";

/** Pencere açıldıktan sonra bu süre boyunca tıklamalar yok sayılır (ms) */
const OPEN_GUARD_MS = 450;

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: "daily", label: "Günlük" },
  { value: "weekly", label: "Haftalık" },
  { value: "monthly", label: "Aylık" },
  { value: "yearly", label: "Yıllık" },
];

/**
 * Dönem seçim penceresi: basılı tutunca açılan grafik ortak penceresi.
 * Günlük, haftalık, aylık, yıllık ya da özel tarih aralığı seçilir.
 */
export default function PeriodSheet({
  open,
  mode,
  custom,
  onClose,
  onChoose,
  onCustom,
}: {
  open: boolean;
  mode: RangeMode;
  custom: [Date, Date] | null;
  onClose: () => void;
  onChoose: (period: Period) => void;
  onCustom: (range: [Date, Date]) => void;
}) {
  const [view, setView] = useState<"menu" | "custom">("menu");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const openedAt = useRef(0);

  // Pencere her açıldığında ana seçenekler gösterilir
  useEffect(() => {
    if (!open) return;
    openedAt.current = Date.now();
    setView("menu");
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  function openCustom() {
    const today = new Date();
    // Özel aralık zaten seçiliyse onun tarihleriyle, değilse bu ayın başı – bugün ile başlar
    const [start, endExclusive] =
      mode === "custom" && custom
        ? custom
        : [
            new Date(today.getFullYear(), today.getMonth(), 1),
            new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1),
          ];
    setFrom(toDateInput(start));
    setTo(toDateInput(new Date(endExclusive.getFullYear(), endExclusive.getMonth(), endExclusive.getDate() - 1)));
    setView("custom");
  }

  const fromDate = fromDateInput(from);
  const toDate = fromDateInput(to);
  const rangeError = fromDate && toDate && toDate < fromDate ? t("Bitiş tarihi başlangıçtan önce olamaz.") : "";
  const canCreate = Boolean(fromDate && toDate) && !rangeError;

  function submitCustom(event: FormEvent) {
    event.preventDefault();
    if (!canCreate || !fromDate || !toDate) return;
    haptic("success");
    // Bitiş günü de dahil olsun diye ertesi günün başlangıcı alınır
    onCustom([fromDate, new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate() + 1)]);
  }

  return createPortal(
    <div
      className="action-backdrop"
      onClickCapture={(e) => {
        // Basılı tutarak açılırken parmak kalkınca gelen tıklama pencereyi kapatmasın
        if (Date.now() - openedAt.current < OPEN_GUARD_MS) {
          e.stopPropagation();
          e.preventDefault();
        }
      }}
      onClick={onClose}
    >
      {view === "menu" && (
        <div className="action-sheet is-centered" role="dialog" aria-label={t("Dönem seç")} onClick={(e) => e.stopPropagation()}>
          <div className="action-handle" aria-hidden="true" />
          <h2 className="sheet-title">{t("Dönem seç")}</h2>
          <p className="sheet-note">{t("Grafiği hangi döneme göre görmek istediğinizi seçin.")}</p>
          <div className="period-options">
            {PERIOD_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`action-btn ${mode === option.value ? "is-active" : ""}`}
                aria-pressed={mode === option.value}
                onClick={() => {
                  haptic("light");
                  onChoose(option.value);
                }}
              >
                {t(option.label)}
              </button>
            ))}
          </div>
          <div className="sheet-divider" aria-hidden="true">
            <span>{t("veya")}</span>
          </div>
          <button
            type="button"
            className={`action-btn custom-option ${mode === "custom" ? "is-active" : ""}`}
            aria-pressed={mode === "custom"}
            onClick={openCustom}
          >
            <Svg d="M4 5h16v15H4zM4 10h16M8 3v4M16 3v4" />
            {t("Özel tarih aralığı")}
          </button>
          <button type="button" className="action-btn is-cancel" onClick={onClose}>
            {t("Vazgeç")}
          </button>
        </div>
      )}

      {view === "custom" && (
        <form className="action-sheet is-centered" role="dialog" aria-label={t("Özel tarih aralığı")} onClick={(e) => e.stopPropagation()} onSubmit={submitCustom} noValidate>
          <div className="action-handle" aria-hidden="true" />
          <h2 className="sheet-title">{t("Özel tarih aralığı")}</h2>
          <p className="sheet-note">{t("Grafik, seçtiğiniz iki tarih arasındaki (bu günler dahil) işlemlerle oluşturulur.")}</p>
          <div className="date-range">
            <div className="field">
              <label htmlFor="range-from">{t("Başlangıç")}</label>
              <input id="range-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-invalid={rangeError ? true : undefined} />
            </div>
            <div className="field">
              <label htmlFor="range-to">{t("Bitiş")}</label>
              <input id="range-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-invalid={rangeError ? true : undefined} aria-describedby={rangeError ? "range-error" : undefined} />
            </div>
          </div>
          {rangeError && (
            <p className="form-error" id="range-error" role="alert">
              {rangeError}
            </p>
          )}
          <button className="primary-btn" type="submit" disabled={!canCreate}>
            {t("GRAFİĞİ OLUŞTUR")}
          </button>
          <button type="button" className="action-btn is-cancel" onClick={() => setView("menu")}>
            {t("Geri")}
          </button>
        </form>
      )}
    </div>,
    document.body,
  );
}
