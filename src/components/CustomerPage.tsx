import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  TX_TYPES,
  balanceOf,
  signOf,
  transactionsOf,
  type Customer,
  type Transaction,
  type TxType,
} from "../data/mock";
import { formatDateTime, money } from "../lib/format";
import { Svg } from "./Icon";
import Keypad from "./Keypad";

/** İşlem türüne göre vurgu rengi */
const ACCENT: Record<TxType, { color: string; fill: string }> = {
  SATIŞ: { color: "#3c8fd9", fill: "#3c8fd9" },
  ALIŞ: { color: "#e4574a", fill: "#e4574a" },
  TAHSİLAT: { color: "#3fbf82", fill: "#3fbf82" },
};

/** Ekrandaki metinden tutar üretir; geçersizse null */
function parseAmount(text: string): number | null {
  const value = Number(text.replace(",", "."));
  return text && Number.isFinite(value) ? value : null;
}

/** datetime-local alanı için yerel "şimdi" değeri */
function localNow(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export default function CustomerPage({
  customer,
  transactions,
  onAdd,
  onBack,
}: {
  customer: Customer;
  transactions: Transaction[];
  onAdd: (tx: Transaction) => void;
  onBack: () => void;
}) {
  const [txType, setTxType] = useState<TxType>("SATIŞ");
  const [amount, setAmount] = useState("");
  // Sayfa tuş takımı açık gelir; kayıttan sonra da kapanmaz
  const [keypadOpen, setKeypadOpen] = useState(true);
  const [dateValue, setDateValue] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  // Az önce kaydedilen işlemler: listede kaydırılıp kısa süre vurgulanır
  const [justAdded, setJustAdded] = useState<string[]>([]);
  const newRowRef = useRef<HTMLLIElement>(null);
  const entryRef = useRef<HTMLDivElement>(null);

  const history = transactionsOf(transactions, customer.id);
  const value = parseAmount(amount);
  const canSave = value !== null && value > 0;
  const lastNewId = [...history]
    .reverse()
    .find((t) => justAdded.includes(t.id))?.id;

  // Eklenen satır, alttaki giriş panelinin arkasında kalmayacak şekilde görünür yapılır
  useEffect(() => {
    const row = newRowRef.current;
    const panel = entryRef.current;
    if (!row || !panel) return;
    const rect = row.getBoundingClientRect();
    const visibleBottom = panel.getBoundingClientRect().top - 12;
    if (rect.bottom > visibleBottom) {
      window.scrollBy({ top: rect.bottom - visibleBottom, behavior: "smooth" });
    } else if (rect.top < 0) {
      window.scrollBy({ top: rect.top - 12, behavior: "smooth" });
    }
  }, [justAdded]);

  function resetFields() {
    setAmount("");
    setDescription("");
    setDateValue(null);
  }

  /** Formdaki mevcut değerlerden işlem üretir; tutar geçersizse null */
  function buildCurrent(): Transaction | null {
    if (value === null || value <= 0) return null;
    return {
      id: `t${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      customerId: customer.id,
      type: txType,
      date: dateValue ? new Date(dateValue).toISOString() : new Date().toISOString(),
      description,
      amount: value,
    };
  }

  /** Formdaki işlemi kaydet */
  function save() {
    const tx = buildCurrent();
    if (!tx) return;
    onAdd(tx);
    setJustAdded([tx.id]);
    resetFields();
  }

  return (
    <div className="cust-page">
      <header className="cust-header">
        <button className="round-btn" aria-label="Geri" onClick={onBack}>
          <Svg d="M15 5l-7 7 7 7" />
        </button>

        <div className="cust-title">
          <span className="cust-avatar" aria-hidden="true">
            <Svg d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0" />
          </span>
          <div className="cust-name">
            <strong>{customer.name}</strong>
            <small>
              {customer.phone ||
                customer.email ||
                customer.address ||
                "İletişim bilgisi ekle"}
            </small>
          </div>
        </div>

        <div className="cust-tools">
          <button aria-label="Paylaş">
            <Svg d="M12 3v12M8 7l4-4 4 4M5 13v6h14v-6" />
          </button>
          <button aria-label="Ayarlar">
            <Svg d="M4 7h16M4 17h16M9 4v6M15 14v6" />
          </button>
        </div>
      </header>

      <ul className="tx-list">
        {history.map((t) => {
          const outflow = signOf(t.type) < 0;
          return (
            <li
              key={t.id}
              ref={t.id === lastNewId ? newRowRef : undefined}
              className={`tx ${justAdded.includes(t.id) ? "is-new" : ""}`}
            >
              <div className="tx-info">
                <div className="tx-meta">
                  <strong style={{ color: ACCENT[t.type].color }}>
                    {t.type}
                  </strong>
                  <span>{formatDateTime(t.date)}</span>
                </div>
                {t.description && <p>{t.description}</p>}
              </div>
              <span className={`tx-amount ${outflow ? "is-debt" : ""}`}>
                {outflow ? "-" : ""}
                {money.format(t.amount)}
              </span>
            </li>
          );
        })}
      </ul>

      {history.length === 0 && <p className="tx-empty">Henüz hareket yok.</p>}

      <div className="tx-total">
        <span>TOPLAM</span>
        <strong>{money.format(balanceOf(transactions, customer.id))}</strong>
      </div>

      <button className="help-link" type="button">
        <Svg d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5M12 17h0" />
        Yardım &amp; Öneri
      </button>

      {/* Alt bölüm: işlem girişi ve tuş takımı */}
      <div ref={entryRef} className="entry-dock">
      <section
        className="entry"
        style={
          {
            "--accent": ACCENT[txType].color,
            "--accent-fill": ACCENT[txType].fill,
          } as CSSProperties
        }
      >
        <div className="entry-field">
          {dateValue ? (
            <input
              type="datetime-local"
              aria-label="Tarih"
              value={dateValue}
              onChange={(e) => setDateValue(e.target.value)}
            />
          ) : (
            <button
              className="entry-placeholder"
              type="button"
              onClick={() => setDateValue(localNow())}
            >
              Tarih: şimdi
            </button>
          )}
          <button
            className="entry-icon"
            type="button"
            aria-label="Tarih seç"
            onClick={() => setDateValue(dateValue ?? localNow())}
          >
            <Svg d="M4 5h16v15H4zM4 10h16M8 3v4M16 3v4" />
          </button>
        </div>

        <div className="entry-desc">
          <textarea
            placeholder="Açıklama"
            aria-label="Açıklama"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <button className="entry-icon entry-attach" type="button" aria-label="Görsel ekle">
            <Svg d="M4 5h16v14H4zM4 16l5-5 4 4 2-2 5 5M15 9h.01" />
          </button>
        </div>

        <div className="entry-amount">
          <button
            className="entry-icon"
            type="button"
            aria-label="Tuş takımını aç"
            onClick={() => setKeypadOpen((open) => !open)}
          >
            <Svg d="M6 3h12v18H6zM9 7h6M9 11h1M12 11h1M15 11h1M9 15h1M12 15h1M15 15h1" />
          </button>
          <button
            className={`amount-field ${amount ? "" : "is-empty"}`}
            type="button"
            aria-label="Tutar"
            onClick={() => setKeypadOpen(true)}
          >
            {amount || "0"}
          </button>
          <button
            className="save-btn"
            type="button"
            disabled={!canSave}
            onClick={save}
          >
            {txType}
          </button>
        </div>

        <div className="entry-tabs" role="tablist" aria-label="İşlem türü">
          {TX_TYPES.map((type) => (
            <button
              key={type}
              role="tab"
              aria-selected={txType === type}
              className={txType === type ? "is-active" : ""}
              onClick={() => setTxType(type)}
            >
              {type}
            </button>
          ))}
        </div>
      </section>

      {keypadOpen && <Keypad value={amount} onChange={setAmount} />}
      </div>
    </div>
  );
}
