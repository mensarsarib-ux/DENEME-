import { useEffect, useRef, useState } from "react";
import AccountDeleteDialog from "./AccountDeleteDialog";
import { currentDeviceId, listDevices, removeDevice, type DeviceInfo, type Session } from "../lib/cloud";
import type { Settings } from "../data/mock";
import { locale, t } from "../lib/i18n";
import { CURRENCIES, currencyOf } from "../lib/currencies";
import { haptic } from "../lib/haptics";
import { MENU_ITEMS } from "../lib/menu";
import type { SyncStatus } from "../lib/useCloudSync";
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

/** Ayarlar: titreşim, destek e-postası, yedekleme ve sıfırlama */
const SIZES = ["small", "medium", "large"] as const;

/** Yazı boyutu: üç seçenek yan yana; sağa kaydırınca büyür, sola kaydırınca küçülür */
function TextSizePicker({
  value,
  onChange,
}: {
  value: Settings["textSize"];
  onChange: (size: Settings["textSize"]) => void;
}) {
  const start = useRef<number | null>(null);
  const idx = SIZES.indexOf(value);
  const labels = { small: t("Küçük"), medium: t("Orta"), large: t("Büyük") };

  const go = (next: number) => {
    const clamped = Math.min(SIZES.length - 1, Math.max(0, next));
    if (clamped === idx) return;
    haptic("light");
    onChange(SIZES[clamped]);
  };

  return (
    <div
      className="size-picker"
      role="radiogroup"
      aria-label={t("Yazı boyutu")}
      onPointerDown={(e) => {
        start.current = e.clientX;
      }}
      onPointerUp={(e) => {
        if (start.current === null) return;
        const dx = e.clientX - start.current;
        start.current = null;
        if (Math.abs(dx) > 36) go(idx + (dx > 0 ? 1 : -1));
      }}
      onPointerCancel={() => {
        start.current = null;
      }}
    >
      <span className="size-thumb" style={{ transform: `translateX(${idx * 100}%)` }} aria-hidden="true" />
      {SIZES.map((s, i) => (
        <button
          key={s}
          type="button"
          role="radio"
          aria-checked={i === idx}
          className={`size-option ${i === idx ? "is-active" : ""}`}
          style={{ fontSize: s === "small" ? "0.85rem" : s === "large" ? "1.15rem" : "1rem" }}
          onClick={() => go(i)}
        >
          {labels[s]}
        </button>
      ))}
    </div>
  );
}

/** Bağlı cihazlar şimdilik Ayarlar'da gizli; kodu duruyor */
const SHOW_DEVICES = false;

export default function SettingsPage({
  settings,
  backupText,
  onChange,
  account,
  onRestore,
  onReset,
  onRestoreFromAccount,
  onBack,
}: {
  settings: Settings;
  /** Tüm verilerin JSON yedeği */
  backupText: string;
  onChange: (settings: Settings) => void;
  /** Giriş yapılmışsa hesap bilgisi ve eşitleme durumu; yerel kullanımda yok */
  account?: {
    email: string;
    session: Session;
    status: SyncStatus;
    lastSync: Date | null;
    onSync: () => void;
    onSignOut: () => void;
    /** Hesabı ve tüm verileri kalıcı olarak siler */
    onDeleteAccount: () => void;
  };
  /** Hata varsa mesajını, başarılıysa null döndürür */
  onRestore: (text: string) => string | null;
  onReset: () => void;
  /** Hesaptaki veriyi çekip cihaza geri yükler; hata metni ya da null döner */
  onRestoreFromAccount?: () => Promise<string | null>;
  onBack: () => void;
}) {
  const [backupDone, setBackupDone] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [restoreMsg, setRestoreMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [devices, setDevices] = useState<DeviceInfo[] | null>(null);
  const [devicesFailed, setDevicesFailed] = useState(false);
  const session = account?.session;

  // Bağlı cihazlar: açıkken yarım dakikada bir yenilenir
  useEffect(() => {
    if (!session) return;
    let alive = true;
    const load = () =>
      listDevices(session)
        .then((list) => {
          if (!alive || list === "expired") return;
          setDevices(list);
          setDevicesFailed(false);
        })
        .catch(() => alive && setDevicesFailed(true));
    void load();
    const timer = window.setInterval(load, 30_000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [session]);

  const thisDevice = currentDeviceId();
  const nowMs = Date.now();
  const [pickingCurrency, setPickingCurrency] = useState(false);
  const current = currencyOf(settings.currency);
  const set = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    onChange({ ...settings, [key]: value });

  /** Yedeği telefona kaydedilebilecek bir JSON dosyası olarak indirir */
  function downloadBackup() {
    const url = URL.createObjectURL(new Blob([backupText], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `hesabim-yedek-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    haptic("success");
    setBackupDone(true);
  }

  /** Seçilen yedek dosyasını okur ve doğrudan geri yükler */
  async function loadFile(file: File) {
    const text = await file.text();
    const error = onRestore(text);
    if (error) {
      haptic("warning");
      setRestoreMsg({ ok: false, text: t(error) });
      return;
    }
    haptic("success");
    setRestoreMsg({ ok: true, text: t("Yedek dosyası yüklendi, veriler geri döndü.") });
    setRestoring(false);
  }

  /** Hesaptaki veriyi çekip geri yükler */
  async function pullFromAccount() {
    if (!onRestoreFromAccount) return;
    haptic("light");
    const error = await onRestoreFromAccount();
    if (error) {
      haptic("warning");
      setRestoreMsg({ ok: false, text: error });
      return;
    }
    haptic("success");
    setRestoreMsg({ ok: true, text: t("Hesaptaki veriler geri çekildi.") });
    setRestoring(false);
  }

  return (
    <div className="cust-page">
      <PageHeader title={t("Ayarlar")} subtitle={t("Tercihleriniz bu cihazda saklanır")} icon={ICON} onBack={onBack} />
      <div className="stack">
        {account && (
          <section className="card" aria-label={t("Hesap")}>
            <h2 className="card-title">{t("Hesap")}</h2>
            <p className="account-email">{account.email}</p>
            <p className="card-empty" role="status">
              {account.status === "error"
                ? t("Eşitlenemedi; internet gelince yeniden denenecek.")
                : account.status === "syncing" || account.status === "loading"
                  ? t("Eşitleniyor…")
                  : account.lastSync
                    ? t("Son eşitleme: {time}", { time: account.lastSync.toLocaleTimeString(locale(), { hour: "2-digit", minute: "2-digit" }) })
                    : t("Verileriniz hesabınızla eşitlenir; aynı e-posta ve şifreyle başka telefondan da girebilirsiniz.")}
            </p>
            <div className="card-actions">
              <button type="button" className="action-btn" onClick={account.onSync}>{t("Şimdi eşitle")}</button>
            </div>
          </section>
        )}

        {SHOW_DEVICES && account && (
          <section className="card" aria-label={t("Bağlı cihazlar")}>
            <h2 className="card-title">{t("Bağlı cihazlar")}</h2>
            {devicesFailed && <p className="field-hint">{t("Cihazlar yüklenemedi.")}</p>}
            {!devices && !devicesFailed && <p className="card-empty">{t("Yükleniyor…")}</p>}
            {devices && (
              <ul className="device-list">
                {devices.map((d) => {
                  const online = nowMs - new Date(d.lastSeen).getTime() < 3 * 60_000;
                  return (
                    <li key={d.deviceId} className="device-row">
                      <span className={`device-dot ${online ? "is-online" : ""}`} aria-hidden="true" />
                      <span className="device-text">
                        <strong>
                          {d.label || t("Bilinmeyen cihaz")}
                          {d.deviceId === thisDevice && <span className="device-tag">{t("Bu cihaz")}</span>}
                        </strong>
                        <small>
                          {online
                            ? t("Şu anda açık")
                            : t("Son görülme: {time}", {
                                time: new Date(d.lastSeen).toLocaleString(locale(), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }),
                              })}
                        </small>
                      </span>
                      {d.deviceId !== thisDevice && account?.session && (
                        <button
                          type="button"
                          className="device-remove"
                          onClick={async () => {
                            const r = await removeDevice(account.session!, d.deviceId);
                            if (r === true) setDevices((list) => (list ? list.filter((x) => x.deviceId !== d.deviceId) : list));
                          }}
                        >
                          {t("Kaldır")}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}

        <section className="card" aria-label={t("Genel")}>
          <h2 className="card-title">{t("Genel")}</h2>
          <Switch
            label={t("Titreşim")}
            hint={t("Düğmelere ve işlemlere dokununca hafif titreşim (iPhone desteklemeyebilir)")}
            checked={settings.haptics}
            onChange={(v) => set("haptics", v)}
          />
        </section>

        <section className="card" aria-label={t("Yazı boyutu")}>
          <h2 className="card-title">{t("Yazı boyutu")}</h2>
          <TextSizePicker value={settings.textSize} onChange={(v) => set("textSize", v)} />
          <p className="field-hint">{t("Sağa veya sola kaydırın ya da bir seçeneğe dokunun.")}</p>
        </section>

        <section className="card" aria-label={t("Liste sıralaması")}>
          <h2 className="card-title">{t("Liste sıralaması")}</h2>
          <div className="sort-options" role="radiogroup" aria-label={t("Liste sıralaması")}>
            {(
              [
                ["name", t("A → Z")],
                ["balance-asc", t("Küçükten büyüğe")],
                ["balance-desc", t("Büyükten küçüğe")],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={settings.listSort === value}
                className={`sort-btn ${settings.listSort === value ? "is-active" : ""}`}
                onClick={() => {
                  haptic("light");
                  set("listSort", value);
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="field-hint">{t("Müşteri ve tedarikçi listeleri bu sıraya göre dizilir.")}</p>
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
            <button type="button" className="action-btn" onClick={downloadBackup}>{t("Yedekleme al")}</button>
            <button type="button" className="action-btn" onClick={() => { setRestoring((r) => !r); setRestoreMsg(null); }}>
              {t("Geri yükle")}
            </button>
          </div>
          {backupDone && <p className="form-success">{t("Yedek dosyası hazırlandı. Telefonunuza kaydedin.")}</p>}
          {restoring && (
            <div className="field">
              <div className="card-actions">
                <label className="action-btn file-btn">
                  {t("Dosya ekle")}
                  <input
                    type="file"
                    accept=".json,application/json"
                    hidden
                    onChange={(e) => {
                      const file = e.currentTarget.files?.[0];
                      if (file) void loadFile(file);
                      e.currentTarget.value = "";
                    }}
                  />
                </label>
                {account?.session && onRestoreFromAccount && (
                  <button type="button" className="action-btn" onClick={pullFromAccount}>
                    {t("Hesaptan çek")}
                  </button>
                )}
              </div>
            </div>
          )}
          {restoreMsg && (
            <p className={restoreMsg.ok ? "form-success" : "field-hint"} role="status">{restoreMsg.text}</p>
          )}
          <button type="button" className="action-btn is-danger" onClick={() => setConfirmReset(true)}>
            {t("Tüm verileri sıfırla")}
          </button>
        </section>

        {account && (
          <section className="card" aria-label={t("Hesap işlemleri")}>
            <h2 className="card-title">{t("Hesap işlemleri")}</h2>
            <div className="card-actions">
              <button
                type="button"
                className="action-btn is-danger"
                onClick={() => setConfirmDelete(true)}
              >
                {t("Hesabımı sil")}
              </button>
            </div>
          </section>
        )}
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

      {confirmDelete && account && (
        <AccountDeleteDialog
          email={account.email}
          onClose={() => setConfirmDelete(false)}
          onConfirm={() => {
            setConfirmDelete(false);
            account.onDeleteAccount();
          }}
        />
      )}


      {confirmReset && account && (
        <AccountDeleteDialog
          email={account.email}
          title={t("Verileri silmek için şifrenizi girin")}
          note={t("Bu cihazdaki tüm kayıtlar, notlar ve ayarlar silinir. Hesabınızdaki veriler silinmez; hesaptan geri çekebilirsiniz.")}
          actionLabel={t("Tüm verileri sil")}
          onClose={() => setConfirmReset(false)}
          onConfirm={() => {
            setConfirmReset(false);
            onReset();
          }}
        />
      )}
      {confirmReset && !account && (
        <div className="action-backdrop" onClick={() => setConfirmReset(false)}>
          <div className="action-sheet is-centered" role="alertdialog" aria-label={t("Sıfırlama onayı")} onClick={(e) => e.stopPropagation()}>
            <div className="action-handle" aria-hidden="true" />
            <h2 className="sheet-title">{t("Tüm verileri sıfırlamak istediğinize emin misiniz?")}</h2>
            <p className="sheet-note">{t("Bu cihazdaki kayıtlar, notlar ve ayarlar silinir. Hesabınız açık kalır ve hesabınızdaki veriler cihaza geri gelir. Hesabınızdaki veriler silinmez. Bu işlem bu cihaz için geri alınamaz.")}</p>
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
