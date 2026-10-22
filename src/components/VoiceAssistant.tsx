import { useEffect, useMemo, useRef, useState } from "react";
import { TX_TYPES, needsAccount, type Account, type AccountId, type Customer, type Transaction, type TxType } from "../data/mock";
import { ACCENT } from "../lib/accents";
import { haptic } from "../lib/haptics";
import { getLanguage, t } from "../lib/i18n";
import { currencySymbol } from "../lib/format";
import { parseVoice, resolveIntent } from "../lib/voice";
import { parseAmount } from "../lib/amount";
import { Svg } from "./Icon";

const MIC_ICON = "M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3zM6 11a6 6 0 0 0 12 0M12 17v4M9 21h6";
/** Bundan kısa basış "basılı tutun" ipucu sayılır (ms) */
const TAP_MS = 350;

// Tarayıcının konuşma tanıma arayüzü (TypeScript kütüphanesinde tanımlı değil)
interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

function createRecognition(): Recognition | null {
  const w = window as unknown as {
    SpeechRecognition?: new () => Recognition;
    webkitSpeechRecognition?: new () => Recognition;
  };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

/**
 * Sağ alttaki sesli komut düğmesi: basılı tutulduğu sürece dinler, bırakınca konuşmayı işlem taslağına çevirir.
 * Taslak her zaman onay penceresinde gösterilir; kullanıcı "EKLE"ye basmadan hiçbir şey kaydedilmez.
 */
export default function VoiceAssistant({
  parties,
  accounts,
  onCommit,
}: {
  parties: Customer[];
  accounts: Account[];
  /** Onaylanan işlemi kaydeder */
  onCommit: (tx: Transaction) => void;
}) {
  const [listening, setListening] = useState(false);
  const [live, setLive] = useState("");
  // Onay penceresi: null kapalı; metin yazarak da kullanılabilir (tanıma yoksa ya da izin verilmediyse)
  const [sheet, setSheet] = useState<{ text: string; notice?: string } | null>(null);
  const [hint, setHint] = useState(false);
  const recRef = useRef<Recognition | null>(null);
  const transcriptRef = useRef("");
  const pressedAt = useRef(0);
  const failed = useRef<string | null>(null);

  useEffect(() => {
    if (!hint) return;
    const timer = window.setTimeout(() => setHint(false), 2600);
    return () => window.clearTimeout(timer);
  }, [hint]);

  useEffect(() => () => recRef.current?.abort(), []);

  function press() {
    haptic("medium");
    pressedAt.current = performance.now();
    failed.current = null;
    transcriptRef.current = "";
    setLive("");
    const rec = createRecognition();
    if (!rec) {
      setSheet({ text: "", notice: t("Bu tarayıcıda ses tanıma yok; komutu yazabilirsiniz.") });
      return;
    }
    rec.lang = getLanguage() === "en" ? "en-US" : "tr-TR";
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e) => {
      let text = "";
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript + " ";
      transcriptRef.current = text.trim();
      setLive(transcriptRef.current);
    };
    rec.onerror = (e) => {
      failed.current = e.error;
    };
    rec.onend = () => {
      setListening(false);
      recRef.current = null;
      const text = transcriptRef.current;
      const error = failed.current;
      if (error === "not-allowed" || error === "service-not-allowed") {
        setSheet({ text: "", notice: t("Mikrofon izni verilmedi; komutu yazabilirsiniz.") });
      } else if (text) {
        setSheet({ text });
      } else if (error && error !== "aborted" && error !== "no-speech") {
        setSheet({ text: "", notice: t("Ses tanıma çalışmadı; komutu yazabilirsiniz.") });
      } else if (performance.now() - pressedAt.current >= TAP_MS) {
        setHint(true);
        setLive("");
      }
    };
    recRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      recRef.current = null;
      setSheet({ text: "", notice: t("Ses tanıma başlatılamadı; komutu yazabilirsiniz.") });
    }
  }

  function release() {
    const rec = recRef.current;
    if (!rec) return;
    if (performance.now() - pressedAt.current < TAP_MS) {
      // Kısa dokunuş: dinlemeyi iptal et ve nasıl kullanılacağını göster
      rec.onend = null;
      rec.abort();
      recRef.current = null;
      setListening(false);
      setHint(true);
      return;
    }
    rec.stop();
  }

  return (
    <>
      <button
        type="button"
        className={`voice-fab ${listening ? "is-listening" : ""}`}
        aria-label={t("Sesli komut: basılı tutarak konuşun")}
        onPointerDown={press}
        onPointerUp={release}
        onPointerCancel={release}
        onContextMenu={(e) => e.preventDefault()}
      >
        <Svg d={MIC_ICON} />
      </button>

      {listening && (
        <div className="voice-live" role="status" aria-live="polite">
          <span className="voice-dot" aria-hidden="true" />
          <span>{live || t("Dinliyorum… konuşun, bitince parmağınızı kaldırın")}</span>
        </div>
      )}
      {hint && !listening && (
        <div className="voice-live is-hint" role="status">
          {t("Düğmeye basılı tutarak konuşun. Örnek: “Ahmet Yılmaz’a 10.000 TL ekle”")}
        </div>
      )}

      {sheet && (
        <VoiceSheet
          key={sheet.text + (sheet.notice ?? "")}
          initial={sheet.text}
          notice={sheet.notice}
          parties={parties}
          accounts={accounts}
          onCommit={(tx) => {
            onCommit(tx);
            setSheet(null);
          }}
          onClose={() => setSheet(null)}
        />
      )}
    </>
  );
}

function VoiceSheet({
  initial,
  notice,
  parties,
  accounts,
  onCommit,
  onClose,
}: {
  initial: string;
  notice?: string;
  parties: Customer[];
  accounts: Account[];
  onCommit: (tx: Transaction) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState(initial);
  const command = useMemo(() => parseVoice(text, parties), [text, parties]);
  // Kullanıcının elle değiştirdikleri, konuşmadan gelen tahminin önüne geçer
  const [partyOverride, setPartyOverride] = useState<string | null>(null);
  const [typeOverride, setTypeOverride] = useState<TxType | null>(null);
  const [amountOverride, setAmountOverride] = useState<string | null>(null);
  const [accountOverride, setAccountOverride] = useState<AccountId | null>(null);

  const sorted = useMemo(
    () => [...parties].sort((a, b) => a.name.localeCompare(b.name, "tr")),
    [parties],
  );
  const partyId = partyOverride ?? command.partyIds[0] ?? "";
  const party = parties.find((p) => p.id === partyId);
  const type = typeOverride ?? (party ? resolveIntent(command.intent, party.kind) : null);
  const amount =
    amountOverride !== null ? parseAmount(amountOverride) : command.amount;
  const account = accountOverride ?? command.account;
  const ready = !!party && !!type && amount !== null && amount > 0;
  const candidates = command.partyIds
    .map((id) => parties.find((p) => p.id === id))
    .filter((p): p is Customer => !!p);

  function save() {
    if (!party || !type || amount === null) return;
    onCommit({
      id: `v${Date.now()}`,
      customerId: party.id,
      type,
      date: new Date().toISOString(),
      description: t("Sesli komut"),
      amount,
      account: needsAccount(type) ? account : undefined,
    });
  }

  return (
    <div className="action-backdrop" data-keep-keypad onClick={onClose}>
      <div
        className="action-sheet voice-sheet"
        role="dialog"
        aria-label={t("Sesli komut onayı")}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="action-handle" aria-hidden="true" />
        <h2 className="sheet-title">{t("Sesli komut")}</h2>
        {notice && <p className="sheet-note">{notice}</p>}

        <div className="field">
          <label htmlFor="voice-text">{t("Söylediğiniz")}</label>
          <input
            id="voice-text"
            autoComplete="off"
            placeholder={t("Örn. Ahmet Yılmaz’a 10.000 TL ekle")}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setPartyOverride(null);
              setTypeOverride(null);
              setAmountOverride(null);
            }}
          />
        </div>

        <div className="field">
          <label htmlFor="voice-party">{t("Kişi")}</label>
          <select id="voice-party" value={partyId} onChange={(e) => setPartyOverride(e.target.value)}>
            <option value="">{t("Kişi seçin")}</option>
            {candidates.length > 1 && (
              <optgroup label={t("En yakın eşleşmeler")}>
                {candidates.map((p) => (
                  <option key={`c${p.id}`} value={p.id}>{p.name}</option>
                ))}
              </optgroup>
            )}
            <optgroup label={t("Tüm kişiler")}>
              {sorted.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </optgroup>
          </select>
          {text.trim() !== "" && !party && (
            <p className="form-error">{t("Kişi bulunamadı; listeden seçebilirsiniz.")}</p>
          )}
        </div>

        <div className="voice-types" role="radiogroup" aria-label={t("İşlem türü")}>
          {TX_TYPES.map((tx) => (
            <button
              key={tx}
              type="button"
              role="radio"
              aria-checked={type === tx}
              className={`voice-type ${type === tx ? "is-active" : ""}`}
              style={type === tx ? { color: ACCENT[tx].color, borderColor: ACCENT[tx].color } : undefined}
              onClick={() => setTypeOverride(tx)}
            >
              {t(tx)}
            </button>
          ))}
        </div>

        <div className="field">
          <label htmlFor="voice-amount">{t("Tutar")} ({currencySymbol()})</label>
          <input
            id="voice-amount"
            inputMode="decimal"
            autoComplete="off"
            value={amountOverride ?? (command.amount !== null ? String(command.amount).replace(".", ",") : "")}
            onChange={(e) => setAmountOverride(e.target.value)}
          />
          {text.trim() !== "" && (amount === null || amount <= 0) && (
            <p className="form-error">{t("Tutar anlaşılamadı; elle yazabilirsiniz.")}</p>
          )}
        </div>

        {type && needsAccount(type) && (
          <div className="voice-types" role="radiogroup" aria-label={t("Hesap")}>
            {accounts.map((a) => (
              <button
                key={a.id}
                type="button"
                role="radio"
                aria-checked={account === a.id}
                className={`voice-type ${account === a.id ? "is-active" : ""}`}
                onClick={() => setAccountOverride(a.id)}
              >
                {t(a.name)}
              </button>
            ))}
          </div>
        )}

        <button className="primary-btn" type="button" disabled={!ready} onClick={save}>
          {t("EKLE")}
        </button>
        <button className="action-btn is-cancel" type="button" onClick={onClose}>
          {t("Vazgeç")}
        </button>
      </div>
    </div>
  );
}
