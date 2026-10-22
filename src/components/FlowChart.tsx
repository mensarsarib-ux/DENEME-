import { useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { totalsBetween, type Period, type Transaction } from "../data/mock";
import { money } from "../lib/format";
import { haptic } from "../lib/haptics";
import {
  modeLabel,
  fromDateInput,
  rangeOf,
  titleOf,
  toDateInput,
  type RangeMode,
} from "../lib/ranges";
import { useLongPress } from "../lib/useLongPress";
import { Svg } from "./Icon";
import { t } from "../lib/i18n";

/** Pencere açıldıktan sonra bu süre boyunca tıklamalar yok sayılır (ms) */
const OPEN_GUARD_MS = 450;

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: "daily", label: "Günlük" },
  { value: "weekly", label: "Haftalık" },
  { value: "monthly", label: "Aylık" },
  { value: "yearly", label: "Yıllık" },
];

/** Gelir ya da gider satırı: etiket, tutar ve orantılı çubuk */
function FlowRow({
  label,
  value,
  max,
  tone,
}: {
  label: string;
  value: number;
  max: number;
  tone: "in" | "out";
}) {
  // Sıfır olsa bile küçük bir çıkıntı kalır, çubuk görünür olur
  const width = Math.max((value / max) * 100, 1.5);
  return (
    <div className={`flow-row flow-${tone}`}>
      <div className="flow-row-top">
        <span className="flow-label">{label}</span>
        <span className="flow-amount">{money.format(value)}</span>
      </div>
      <div className="flow-track">
        <div className="flow-fill" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

type Sheet = "menu" | "custom" | null;

/**
 * Gelir ve gider grafiği: gelir = satış toplamı, gider = alış toplamı, net = gelir − gider.
 * Varsayılan aylıktır. Üzerine basılı tutunca günlük, haftalık, aylık, yıllık veya özel tarih aralığı seçilir.
 */
export default function FlowChart({
  transactions,
}: {
  transactions: Transaction[];
}) {
  const [mode, setMode] = useState<RangeMode>("monthly");
  // 0: şimdiki dönem, -1: bir önceki dönem, ...
  const [offset, setOffset] = useState(0);
  const [custom, setCustom] = useState<[Date, Date] | null>(null);
  const [sheet, setSheet] = useState<Sheet>(null);
  const openedAt = useRef(0);

  const { handlers, pressing } = useLongPress(() => {
    openedAt.current = Date.now();
    setSheet("menu");
  });

  // Özel aralık formu
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  useEffect(() => {
    if (!sheet) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSheet(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [sheet]);

  const range = rangeOf(mode, offset, custom);
  const { satis: gelir, alis: gider } = totalsBetween(transactions, range);
  const net = gelir - gider;
  const max = Math.max(gelir, gider, 1);
  const title = titleOf(mode, range);

  const note =
    gelir > 0
      ? t("Gider / gelir: %{n}", { n: Math.round((gider / gelir) * 100) })
      : gider > 0
        ? t("Bu dönemde gelir yok.")
        : t("Bu dönemde işlem yok.");

  function choosePeriod(next: Period) {
    haptic("light");
    setMode(next);
    setOffset(0);
    setSheet(null);
  }

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
    setTo(
      toDateInput(
        new Date(
          endExclusive.getFullYear(),
          endExclusive.getMonth(),
          endExclusive.getDate() - 1,
        ),
      ),
    );
    setSheet("custom");
  }

  const fromDate = fromDateInput(from);
  const toDate = fromDateInput(to);
  const rangeError =
    fromDate && toDate && toDate < fromDate
      ? t("Bitiş tarihi başlangıçtan önce olamaz.")
      : "";
  const canCreate = Boolean(fromDate && toDate) && !rangeError;

  function submitCustom(event: FormEvent) {
    event.preventDefault();
    if (!canCreate || !fromDate || !toDate) return;
    haptic("success");
    // Bitiş günü de dahil olsun diye ertesi günün başlangıcı alınır
    setCustom([
      fromDate,
      new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate() + 1),
    ]);
    setMode("custom");
    setOffset(0);
    setSheet(null);
  }

  return (
    <>
      <div
        className={`chart-card month-card ${pressing ? "is-pressing" : ""}`}
        title={t("Dönemi değiştirmek için basılı tutun")}
        {...handlers}
      >
        <div className="month-head">
          <div className="month-title-block">
            <span className="month-mode">{modeLabel(mode)}</span>
            <div className="month-nav">
              {mode !== "custom" && (
                <button
                  type="button"
                  aria-label={t("Önceki dönem")}
                  onClick={() => setOffset((o) => o - 1)}
                >
                  ‹
                </button>
              )}
              <span className="month-title">{title}</span>
              {mode !== "custom" && (
                <button
                  type="button"
                  aria-label={t("Sonraki dönem")}
                  disabled={offset === 0}
                  onClick={() => setOffset((o) => Math.min(o + 1, 0))}
                >
                  ›
                </button>
              )}
            </div>
          </div>
          <div className="month-net">
            <span className="month-net-label">{t("NET")}</span>
            <strong className={net < 0 ? "is-loss" : ""}>{money.format(net)}</strong>
          </div>
        </div>

        <div className="flow-rows">
          <FlowRow label={t("GELİR")} value={gelir} max={max} tone="in" />
          <FlowRow label={t("GİDER")} value={gider} max={max} tone="out" />
        </div>

        <p className="month-note">{note}</p>
      </div>

      {/* Pencere doğrudan sayfaya çizilir; kayan alanın içinde sıkışıp altta kalmaz */}
      {sheet &&
        createPortal(
        <div
          className="action-backdrop"
          onClickCapture={(e) => {
            // Basılı tutarak açılırken parmak kalkınca gelen tıklama pencereyi kapatmasın
            if (Date.now() - openedAt.current < OPEN_GUARD_MS) {
              e.stopPropagation();
              e.preventDefault();
            }
          }}
          onClick={() => setSheet(null)}
        >
          {sheet === "menu" && (
            <div
              className="action-sheet is-centered"
              role="dialog"
              aria-label={t("Dönem seç")}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="action-handle" aria-hidden="true" />
              <h2 className="sheet-title">{t("Dönem seç")}</h2>
              <p className="sheet-note">
                {t("Grafiği hangi döneme göre görmek istediğinizi seçin.")}
              </p>
              <div className="period-options">
                {PERIOD_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`action-btn ${mode === option.value ? "is-active" : ""}`}
                    aria-pressed={mode === option.value}
                    onClick={() => choosePeriod(option.value)}
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
              <button
                type="button"
                className="action-btn is-cancel"
                onClick={() => setSheet(null)}
              >
                {t("Vazgeç")}
              </button>
            </div>
          )}

          {sheet === "custom" && (
            <form
              className="action-sheet is-centered"
              role="dialog"
              aria-label={t("Özel tarih aralığı")}
              onClick={(e) => e.stopPropagation()}
              onSubmit={submitCustom}
              noValidate
            >
              <div className="action-handle" aria-hidden="true" />
              <h2 className="sheet-title">{t("Özel tarih aralığı")}</h2>
              <p className="sheet-note">
                {t("Grafik, seçtiğiniz iki tarih arasındaki (bu günler dahil) işlemlerle oluşturulur.")}
              </p>
              <div className="date-range">
                <div className="field">
                  <label htmlFor="range-from">{t("Başlangıç")}</label>
                  <input
                    id="range-from"
                    type="date"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                    aria-invalid={rangeError ? true : undefined}
                  />
                </div>
                <div className="field">
                  <label htmlFor="range-to">{t("Bitiş")}</label>
                  <input
                    id="range-to"
                    type="date"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    aria-invalid={rangeError ? true : undefined}
                    aria-describedby={rangeError ? "range-error" : undefined}
                  />
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
              <button
                type="button"
                className="action-btn is-cancel"
                onClick={() => setSheet("menu")}
              >
                {t("Geri")}
              </button>
            </form>
          )}
        </div>,
        document.body,
      )}
    </>
  );
}
