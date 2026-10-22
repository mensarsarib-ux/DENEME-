import { useState } from "react";
import type { Settings } from "../data/mock";
import { CURRENCIES, currencyOf } from "../lib/currencies";
import { LANGUAGES, t } from "../lib/i18n";
import { currencySymbol } from "../lib/format";
import { haptic } from "../lib/haptics";
import { MENU_ITEMS } from "../lib/menu";
import PageHeader from "./PageHeader";

const ICON = MENU_ITEMS[6].icon;

function Switch({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="setting-row">
      <span className="setting-text">
        <strong>{label}</strong>
        {hint && <small>{hint}</small>}
      </span>
      <input
        className="switch"
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(e) => {
          haptic("light");
          onChange(e.target.checked);
        }}
      />
    </label>
  );
}

function Limit({
  id,
  label,
  value,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  disabled: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <div className="field limit-field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        inputMode="numeric"
        autoComplete="off"
        disabled={disabled}
        value={value ? String(value) : ""}
        onChange={(e) => onChange(Number(e.target.value.replace(/\D/g, "")) || 0)}
      />
    </div>
  );
}

/** Ayarlar: titreşim, bildirim limitleri, destek e-postası, yedekleme ve sıfırlama */
export default function SettingsPage({
  settings,
  backupText,
  onChange,
  onRestore,
  onReset,
  onBack,
}: {
  settings: Settings;
  /** Tüm verilerin JSON yedeği */
  backupText: string;
  onChange: (settings: Settings) => void;
  /** Hata varsa mesajını, başarılıysa null döndürür */
  onRestore: (text: string) => string | null;
  onReset: () => void;
  onBack: () => void;
}) {
  const [copied, setCopied] = useState<"ok" | "fail" | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [restoreText, setRestoreText] = useState("");
  const [restoreMsg, setRestoreMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [pickingCurrency, setPickingCurrency] = useState(false);
  const current = currencyOf(settings.currency);
  const set = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    onChange({ ...settings, [key]: value });

  async function copyBackup() {
    try {
      await navigator.clipboard.writeText(backupText);
      setCopied("ok");
      haptic("success");
    } catch {
      setCopied("fail");
    }
  }

  function restore() {
    const error = onRestore(restoreText);
    if (error) {
      haptic("warning");
      setRestoreMsg({ ok: false, text: t(error) });
    } else {
      haptic("success");
      setRestoreMsg({ ok: true, text: t("Yedek geri yüklendi.") });
      setRestoreText("");
      setRestoring(false);
    }
  }

  return (
    <div className="cust-page">
      <PageHeader title={t("Ayarlar")} subtitle={t("Tercihleriniz bu cihazda saklanır")} icon={ICON} onBack={onBack} />
      <div className="stack">
        <section className="card" aria-label={t("Genel")}>
          <h2 className="card-title">{t("Genel")}</h2>
          <Switch
            label={t("Titreşim")}
            hint={t("Düğmelere ve işlemlere dokununca hafif titreşim (iPhone desteklemeyebilir)")}
            checked={settings.haptics}
            onChange={(v) => set("haptics", v)}
          />
        </section>

        <section className="card" aria-label={t("Dil")}>
          <h2 className="card-title">{t("Dil")}</h2>
          <div className="currency-list" role="radiogroup" aria-label={t("Dil")}>
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                type="button"
                role="radio"
                aria-checked={l.code === settings.language}
                className={`currency-option ${l.code === settings.language ? "is-active" : ""}`}
                onClick={() => {
                  haptic("success");
                  set("language", l.code);
                }}
              >
                <span className="currency-badge" aria-hidden="true">{l.flag}</span>
                <span className="setting-text">
                  <strong>{l.native}</strong>
                </span>
                {l.code === settings.language && <span className="currency-check" aria-hidden="true">✓</span>}
              </button>
            ))}
          </div>
        </section>

        <section className="card" aria-label={t("Para birimi")}>
          <h2 className="card-title">{t("Para birimi")}</h2>
          <button type="button" className="currency-current" onClick={() => setPickingCurrency(true)}>
            <span className="currency-badge" aria-hidden="true">{current.symbol}</span>
            <span className="setting-text">
              <strong>{current.flag} {t(current.name)}</strong>
              <small>{current.code}</small>
            </span>
            <span className="drawer-chevron" aria-hidden="true">›</span>
          </button>
          <p className="field-hint">{t("Yalnızca gösterilen simge değişir; mevcut tutarlar başka bir para birimine çevrilmez.")}</p>
        </section>

        <section className="card" aria-label={t("Bildirimler")}>
          <h2 className="card-title">{t("Bildirim limitleri")}</h2>
          <Switch label={t("Yüksek alacak")} hint={t("Bir kişinin alacağı limiti aşınca")} checked={settings.notifyReceivable} onChange={(v) => set("notifyReceivable", v)} />
          <Limit id="lim-rec" label={`${t("Alacak limiti")} (${currencySymbol()})`} value={settings.receivableLimit} disabled={!settings.notifyReceivable} onChange={(v) => set("receivableLimit", v)} />
          <Switch label={t("Yüksek borç")} hint={t("Bir kişiye borcunuz limiti aşınca")} checked={settings.notifyPayable} onChange={(v) => set("notifyPayable", v)} />
          <Limit id="lim-pay" label={`${t("Borç limiti")} (${currencySymbol()})`} value={settings.payableLimit} disabled={!settings.notifyPayable} onChange={(v) => set("payableLimit", v)} />
          <Switch label={t("Düşük kasa")} hint={t("Nakit ve banka toplamı limitin altına inince")} checked={settings.notifyLowCash} onChange={(v) => set("notifyLowCash", v)} />
          <Limit id="lim-cash" label={`${t("Kasa limiti")} (${currencySymbol()})`} value={settings.lowCashLimit} disabled={!settings.notifyLowCash} onChange={(v) => set("lowCashLimit", v)} />
        </section>

        <section className="card" aria-label={t("Destek")}>
          <h2 className="card-title">{t("Destek e-postası")}</h2>
          <div className="field">
            <label htmlFor="support-email">{t("Destek mesajları bu adrese gönderilir")}</label>
            <input
              id="support-email"
              type="email"
              autoComplete="off"
              placeholder={t("destek@sirketiniz.com")}
              value={settings.supportEmail}
              onChange={(e) => set("supportEmail", e.target.value)}
            />
          </div>
        </section>

        <section className="card" aria-label={t("Veriler")}>
          <h2 className="card-title">{t("Veriler")}</h2>
          <p className="card-empty">{t("Veriler yalnızca bu tarayıcıda saklanır. Yedek alıp başka cihaza taşıyabilirsiniz.")}</p>
          <div className="card-actions">
            <button type="button" className="action-btn" onClick={copyBackup}>{t("Yedeği kopyala")}</button>
            <button type="button" className="action-btn" onClick={() => { setRestoring((r) => !r); setRestoreMsg(null); }}>
              {t("Yedekten yükle")}
            </button>
          </div>
          {copied === "ok" && <p className="form-success">{t("Yedek panoya kopyalandı.")}</p>}
          {copied === "fail" && (
            <>
              <p className="field-hint">{t("Kopyalanamadı; metni elle kopyalayın:")}</p>
              <textarea className="copy-box" readOnly rows={5} value={backupText} onFocus={(e) => e.currentTarget.select()} />
            </>
          )}
          {restoring && (
            <div className="field">
              <label htmlFor="restore-text">{t("Yedek metnini yapıştırın")}</label>
              <textarea id="restore-text" rows={5} value={restoreText} onChange={(e) => setRestoreText(e.target.value)} />
              <button type="button" className="primary-btn" disabled={!restoreText.trim()} onClick={restore}>
                {t("GERİ YÜKLE")}
              </button>
            </div>
          )}
          {restoreMsg && (
            <p className={restoreMsg.ok ? "form-success" : "field-hint"} role="status">{restoreMsg.text}</p>
          )}
          <button type="button" className="action-btn is-danger" onClick={() => setConfirmReset(true)}>
            {t("Tüm verileri sıfırla")}
          </button>
        </section>
      </div>

      {pickingCurrency && (
        <div className="action-backdrop" onClick={() => setPickingCurrency(false)}>
          <div className="action-sheet currency-sheet" role="dialog" aria-label={t("Para birimi seç")} onClick={(e) => e.stopPropagation()}>
            <div className="action-handle" aria-hidden="true" />
            <h2 className="sheet-title">{t("Para birimi seç")}</h2>
            <ul className="currency-list">
              {CURRENCIES.map((c) => (
                <li key={c.code}>
                  <button
                    type="button"
                    className={`currency-option ${c.code === settings.currency ? "is-active" : ""}`}
                    aria-pressed={c.code === settings.currency}
                    onClick={() => {
                      haptic("success");
                      set("currency", c.code);
                      setPickingCurrency(false);
                    }}
                  >
                    <span className="currency-badge" aria-hidden="true">{c.symbol}</span>
                    <span className="setting-text">
                      <strong>{c.flag} {t(c.name)}</strong>
                      <small>{c.code}</small>
                    </span>
                    {c.code === settings.currency && <span className="currency-check" aria-hidden="true">✓</span>}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {confirmReset && (
        <div className="action-backdrop" onClick={() => setConfirmReset(false)}>
          <div className="action-sheet is-centered" role="alertdialog" aria-label={t("Sıfırlama onayı")} onClick={(e) => e.stopPropagation()}>
            <div className="action-handle" aria-hidden="true" />
            <h2 className="sheet-title">{t("Tüm verileri sıfırlamak istediğinize emin misiniz?")}</h2>
            <p className="sheet-note">{t("Kayıtlar, notlar ve ayarlar örnek verilere döner. Bu işlem geri alınamaz.")}</p>
            <button className="danger-btn" type="button" onClick={() => { haptic("warning"); setConfirmReset(false); onReset(); }}>
              {t("EVET, SIFIRLA")}
            </button>
            <button className="action-btn is-cancel" type="button" autoFocus onClick={() => setConfirmReset(false)}>{t("Vazgeç")}</button>
          </div>
        </div>
      )}
    </div>
  );
}
