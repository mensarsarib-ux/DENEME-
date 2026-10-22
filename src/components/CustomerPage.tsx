import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  TX_TYPES,
  defaultTxType,
  balanceOf,
  signOf,
  transactionsOf,
  type Customer,
  type Transaction,
  type TxType,
} from "../data/mock";
import { formatDateTime, money } from "../lib/format";
import { haptic } from "../lib/haptics";
import { Svg } from "./Icon";
import Keypad from "./Keypad";

/** İşlem türüne göre vurgu rengi */
const ACCENT: Record<TxType, { color: string; fill: string; glow: string }> = {
  SATIŞ: { color: "#3c8fd9", fill: "#3c8fd9", glow: "rgba(60, 143, 217, 0.55)" },
  ALIŞ: { color: "#e4574a", fill: "#e4574a", glow: "rgba(228, 87, 74, 0.55)" },
  TAHSİLAT: { color: "#3fbf82", fill: "#3fbf82", glow: "rgba(63, 191, 130, 0.55)" },
  ÖDEME: { color: "#e8c547", fill: "#c9a227", glow: "rgba(232, 197, 71, 0.55)" },
};

/** Geri al seçeneğinin ekranda kalma süresi (ms) */
const UNDO_DURATION = 5000;

/** Ekrandaki metinden tutar üretir; geçersizse null */
function parseAmount(text: string): number | null {
  const value = Number(text.replace(",", "."));
  return text && Number.isFinite(value) ? value : null;
}

/** ISO tarihi datetime-local alanının yerel biçimine çevirir */
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export default function CustomerPage({
  customer,
  transactions,
  onAdd,
  onUpdate,
  onDelete,
  onBack,
}: {
  customer: Customer;
  transactions: Transaction[];
  onAdd: (tx: Transaction) => void;
  onUpdate: (tx: Transaction) => void;
  onDelete: (id: string) => void;
  onBack: () => void;
}) {
  // Her sekmede dört işlem türü de girilebilir; müşteride SATIŞ, diğerlerinde ALIŞ seçili başlar
  const [txType, setTxType] = useState<TxType>(defaultTxType(customer.kind));
  const [amount, setAmount] = useState("");
  // Tuş takımı sayfa yerleştikten kısa süre sonra yumuşakça açılır; kayıttan sonra kapanmaz
  const [keypadOpen, setKeypadOpen] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setKeypadOpen(true), 350);
    return () => window.clearTimeout(timer);
  }, []);
  const [dateValue, setDateValue] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  // Seçenek penceresi açık işlem ve düzenlenmekte olan işlem
  const [selected, setSelected] = useState<Transaction | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  // Silinen son işlem: kısa süre "Geri al" ile döndürülebilir
  const [undoTx, setUndoTx] = useState<Transaction | null>(null);
  // Az önce kaydedilen işlemler: listede kaydırılıp kısa süre vurgulanır
  const [justAdded, setJustAdded] = useState<string[]>([]);
  const newRowRef = useRef<HTMLLIElement>(null);
  const entryRef = useRef<HTMLDivElement>(null);

  // Giriş panelinin dışında (işlem listesi, başlık, boş alan) bir yere dokunulunca tuş takımı kapanır.
  // "click" kullanılır: liste kaydırılırken tetiklenmez.
  useEffect(() => {
    if (!keypadOpen) return;
    const closeOnOutsideTap = (event: MouseEvent) => {
      const target = event.target as Element;
      if (target.closest("[data-keep-keypad]")) return;
      const dock = entryRef.current;
      if (dock && !dock.contains(target)) setKeypadOpen(false);
    };
    document.addEventListener("click", closeOnOutsideTap);
    return () => document.removeEventListener("click", closeOnOutsideTap);
  }, [keypadOpen]);

  // Seçenek penceresi Esc ile kapanır
  useEffect(() => {
    if (!selected) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelected(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [selected]);

  // "Geri al" bir süre sonra kaybolur
  useEffect(() => {
    if (!undoTx) return;
    const timer = window.setTimeout(() => setUndoTx(null), UNDO_DURATION);
    return () => window.clearTimeout(timer);
  }, [undoTx]);

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

  /** Formdaki değerlerden işlem üretir; tutar geçersizse null */
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

  /** Formdaki işlemi kaydet; düzenleme modundaysa mevcut işlemi günceller */
  function save() {
    const tx = buildCurrent();
    if (!tx) return;
    haptic("success");
    if (editingId) {
      onUpdate({ ...tx, id: editingId });
      setJustAdded([editingId]);
      setEditingId(null);
    } else {
      onAdd(tx);
      setJustAdded([tx.id]);
    }
    resetFields();
  }

  /** Seçenek penceresinden "Düzenle": işlemi giriş paneline yükler */
  function startEdit(tx: Transaction) {
    setEditingId(tx.id);
    setTxType(tx.type);
    setAmount(String(tx.amount).replace(".", ","));
    setDescription(tx.description);
    setDateValue(toLocalInput(tx.date));
    setSelected(null);
    setKeypadOpen(true);
  }

  function cancelEdit() {
    setEditingId(null);
    resetFields();
  }

  /** Seçenek penceresinden "Sil": işlemi siler, kısa süre geri alınabilir */
  function remove(tx: Transaction) {
    haptic("warning");
    onDelete(tx.id);
    if (editingId === tx.id) cancelEdit();
    setSelected(null);
    setUndoTx(tx);
  }

  function undoDelete() {
    if (!undoTx) return;
    haptic("light");
    onAdd(undoTx);
    setJustAdded([undoTx.id]);
    setUndoTx(null);
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
              className={`tx ${justAdded.includes(t.id) ? "is-new" : ""} ${editingId === t.id ? "is-editing" : ""}`}
            >
              <button
                className="tx-hit"
                type="button"
                aria-label={`${t.type} işlemi için seçenekler`}
                onClick={() => setSelected(t)}
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
              </button>
            </li>
          );
        })}
      </ul>

      {history.length === 0 && <p className="tx-empty">Henüz hareket yok.</p>}

      <div className="tx-total">
        <span>TOPLAM</span>
        <strong>{money.format(balanceOf(transactions, customer.id))}</strong>
      </div>

      {/* Alt bölüm: işlem girişi ve tuş takımı */}
      <div ref={entryRef} className="entry-dock">
        {undoTx && (
          <div className="toast" role="status">
            <span>İşlem silindi</span>
            <button type="button" onClick={undoDelete}>
              Geri al
            </button>
          </div>
        )}

        <section
          className="entry"
          style={
            {
              "--accent": ACCENT[txType].color,
              "--accent-fill": ACCENT[txType].fill,
            } as CSSProperties
          }
        >
          {editingId && (
            <div className="entry-editing">
              <span>İŞLEMİ DÜZENLE</span>
              <button type="button" onClick={cancelEdit}>
                Vazgeç
              </button>
            </div>
          )}

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
                onClick={() => setDateValue(toLocalInput(new Date().toISOString()))}
              >
                Tarih: şimdi
              </button>
            )}
            {/* Tarih seçiliyse tarayıcının kendi takvim ikonu yeterli */}
            {!dateValue && (
              <button
                className="entry-icon"
                type="button"
                aria-label="Tarih seç"
                onClick={() => setDateValue(toLocalInput(new Date().toISOString()))}
              >
                <Svg d="M4 5h16v15H4zM4 10h16M8 3v4M16 3v4" />
              </button>
            )}
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
              {editingId ? "GÜNCELLE" : "EKLE"}
            </button>
          </div>

          <div className="entry-tabs" role="tablist" aria-label="İşlem türü">
            {TX_TYPES.map((type) => (
              <button
                key={type}
                role="tab"
                aria-selected={txType === type}
                className={txType === type ? "is-active" : ""}
                // Seçilince sekme kendi renginde ışık yayar
                style={
                  {
                    "--tab-accent": ACCENT[type].color,
                    "--tab-glow": ACCENT[type].glow,
                  } as CSSProperties
                }
                onClick={() => {
                  haptic("light");
                  setTxType(type);
                }}
              >
                {type}
              </button>
            ))}
          </div>
        </section>

        <div
          className={`keypad-wrap ${keypadOpen ? "is-open" : ""}`}
          aria-hidden={!keypadOpen}
        >
          <div className="keypad-inner">
            <Keypad value={amount} onChange={setAmount} />
          </div>
        </div>
      </div>

      {/* İşleme dokununca açılan seçenekler */}
      {selected && (
        <div
          className="action-backdrop"
          data-keep-keypad
          onClick={() => setSelected(null)}
        >
          <div
            className="action-sheet"
            role="dialog"
            aria-label="İşlem seçenekleri"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="action-handle" aria-hidden="true" />
            <div className="action-summary">
              <div className="tx-meta">
                <strong style={{ color: ACCENT[selected.type].color }}>
                  {selected.type}
                </strong>
                <span>{formatDateTime(selected.date)}</span>
              </div>
              <span
                className={`tx-amount ${signOf(selected.type) < 0 ? "is-debt" : ""}`}
              >
                {signOf(selected.type) < 0 ? "-" : ""}
                {money.format(selected.amount)}
              </span>
            </div>
            <button
              className="action-btn"
              type="button"
              onClick={() => startEdit(selected)}
            >
              <Svg d="M4 20h4L19 9l-4-4L4 16zM13 7l4 4" />
              Düzenle
            </button>
            <button
              className="action-btn is-danger"
              type="button"
              onClick={() => remove(selected)}
            >
              <Svg d="M5 7h14M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
              Sil
            </button>
            <button
              className="action-btn is-cancel"
              type="button"
              onClick={() => setSelected(null)}
            >
              Vazgeç
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
