import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  TX_TYPES,
  balanceOf,
  needsAccount,
  signOf,
  transactionsOf,
  type Account,
  type AccountId,
  type Customer,
  type Profile,
  type Transaction,
  type TxType,
} from "../data/mock";
import { formatDateTime, money } from "../lib/format";
import { ACCENT } from "../lib/accents";
import { haptic } from "../lib/haptics";
import { t } from "../lib/i18n";
import { Svg } from "./Icon";
import { parseAmount } from "../lib/amount";
import { saveViaViewer } from "../lib/saveFile";
import StatementSheet from "./StatementSheet";
import { statementText } from "../lib/statement";
import Keypad from "./Keypad";

/** Nakit ve banka simgeleri */
const CASH_ICON = "M3 7h18v10H3zM12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM6 10v.01M18 14v.01";
const BANK_ICON = "M3 9l9-5 9 5v1H3zM5 11v7M9 11v7M15 11v7M19 11v7M3 20h18";

/** Geri al seçeneğinin ekranda kalma süresi (ms) */
const UNDO_DURATION = 5000;

/** ISO tarihi datetime-local alanının yerel biçimine çevirir */
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export default function CustomerPage({
  customer,
  accounts,
  transactions,
  onAdd,
  onUpdate,
  onDelete,
  profile,
  onEdit,
  onDeleteParty,
  onBack,
}: {
  /** İşletme bilgileri: ekstrenin başlığında kullanılır */
  profile: Profile;
  /** Düzenle menüsünden "Düzenle": firma bilgileri sayfasını açar */
  onEdit: () => void;
  /** Düzenle menüsünden "Sil": kişiyi ve işlemlerini siler (onaydan sonra) */
  onDeleteParty: () => void;
  customer: Customer;
  accounts: Account[];
  transactions: Transaction[];
  onAdd: (tx: Transaction) => void;
  onUpdate: (tx: Transaction) => void;
  onDelete: (id: string) => void;
  onBack: () => void;
}) {
  // Her sekmede dört işlem türü de girilebilir; müşteride SATIŞ, diğerlerinde ALIŞ seçili başlar
  // Her müşteri açılışında işlem türü önce SATIŞ; kullanıcı isterse değiştirir
  const [txType, setTxType] = useState<TxType>("SATIŞ");
  const [amount, setAmount] = useState("");
  // Tuş takımı sayfa yerleştikten kısa süre sonra yumuşakça açılır; kayıttan sonra kapanmaz
  const [keypadOpen, setKeypadOpen] = useState(false);
  // Açıklama yazılırken tuş takımı kapanır ve yazı klavyesi açılır; tarih ve açıklama görünür kalır
  const [typing, setTyping] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setKeypadOpen(true), 350);
    return () => window.clearTimeout(timer);
  }, []);
  // Yazı klavyesi açılınca giriş paneli klavyenin üstüne kalksın (görünen alanın altına göre)
  useEffect(() => {
    const vv = window.visualViewport;
    const dock = entryRef.current;
    if (!vv || !dock) return;
    const lift = () => {
      dock.style.bottom = `${Math.max(0, window.innerHeight - vv.height - vv.offsetTop)}px`;
    };
    vv.addEventListener("resize", lift);
    vv.addEventListener("scroll", lift);
    return () => {
      vv.removeEventListener("resize", lift);
      vv.removeEventListener("scroll", lift);
      dock.style.bottom = "";
    };
  }, []);
  const [dateValue, setDateValue] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  // Seçenek penceresi açık işlem ve düzenlenmekte olan işlem
  const [selected, setSelected] = useState<Transaction | null>(null);
  // Tahsilat ya da ödeme kaydedilirken "nakit mi, banka mı?" sorusunu bekleyen işlem
  const [asking, setAsking] = useState<Transaction | null>(null);
  // "Sil"e basılınca açılan "emin misiniz?" adımı
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  useEffect(() => setConfirmingDelete(false), [selected]);
  // Kalem düğmesinin altında açılan Düzenle / Sil menüsü ve kişiyi silme onayı
  const [menu, setMenu] = useState<"edit" | "share" | null>(null);
  const menuOpen = menu !== null;
  const setMenuOpen = (open: boolean) => !open && setMenu(null);
  const [statementOpen, setStatementOpen] = useState(false);
  // Gönder sonrası kısa bilgi (ör. panoya kopyalandı)
  const [shareNote, setShareNote] = useState<string | null>(null);
  useEffect(() => {
    if (!shareNote) return;
    const timer = window.setTimeout(() => setShareNote(null), 3000);
    return () => window.clearTimeout(timer);
  }, [shareNote]);
  const [confirmParty, setConfirmParty] = useState(false);
  const toolsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: Event) => {
      if (event instanceof KeyboardEvent ? event.key === "Escape" : !toolsRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("click", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("click", close);
      document.removeEventListener("keydown", close);
    };
  }, [menuOpen]);
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

  // Seçenek penceresi ve hesap sorusu Esc ile kapanır
  useEffect(() => {
    if (!selected && !asking) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelected(null);
        setAsking(null);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [selected, asking]);

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
    .find((row) => justAdded.includes(row.id))?.id;

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

  /**
   * EKLE: tahsilat ve ödemede önce "nakit mi, banka mı?" sorulur; satış ve alış
   * kasayı etkilemediği için doğrudan kaydedilir.
   */
  function save() {
    const tx = buildCurrent();
    if (!tx) return;
    if (needsAccount(tx.type)) {
      setAsking(tx);
      return;
    }
    commit(tx);
  }

  /** Sorulan hesap seçilince işlem o hesaba işlenerek kaydedilir */
  function chooseAccount(account: AccountId) {
    if (!asking) return;
    const tx: Transaction = { ...asking, account };
    setAsking(null);
    commit(tx);
  }

  /** İşlemi kaydeder; düzenleme modundaysa mevcut işlemi günceller */
  function commit(tx: Transaction) {
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

  const statementInput = { party: customer, profile, accounts, transactions };

  /** Paylaş > Gönder: ekstre özetini telefonun paylaşım penceresine verir; yoksa panoya kopyalar */
  async function sendStatement() {
    setMenu(null);
    haptic("light");
    const text = statementText(statementInput);
    try {
      if (navigator.share) {
        await navigator.share({ title: `${t("Cari hesap ekstresi")} — ${customer.name}`, text });
        return;
      }
    } catch (error) {
      if ((error as DOMException)?.name === "AbortError") return;
    }
    // Tarayıcı paylaşımı yoksa (ör. Claude önizlemesi): metni dosya olarak paylaşım/kaydetme penceresine ver
    const viewer = await saveViaViewer(`${t("Ekstre")}.txt`, text);
    if (viewer !== "unavailable") return;
    try {
      await navigator.clipboard.writeText(text);
      setShareNote(t("Paylaşım bu cihazda açılamadı; ekstre panoya kopyalandı."));
    } catch {
      setShareNote(t("Paylaşım bu cihazda kullanılamıyor."));
    }
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
        <button className="round-btn" aria-label={t("Geri")} onClick={onBack}>
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
                t("İletişim bilgisi ekle")}
            </small>
          </div>
        </div>

        <div className="cust-tools" ref={toolsRef}>
          <button
            aria-label={t("Paylaş")}
            aria-haspopup="menu"
            aria-expanded={menu === "share"}
            onClick={() => {
              haptic("light");
              setMenu((m) => (m === "share" ? null : "share"));
            }}
          >
            <Svg d="M12 3v12M8 7l4-4 4 4M5 13v6h14v-6" />
          </button>
          <button
            aria-label={t("Düzenle menüsü")}
            aria-haspopup="menu"
            aria-expanded={menu === "edit"}
            onClick={() => {
              haptic("light");
              setMenu((m) => (m === "edit" ? null : "edit"));
            }}
          >
            <Svg d="M4 20h4L19 9l-4-4L4 16zM13 7l4 4" />
          </button>
          {menu === "edit" && (
            <div className="tools-menu" role="menu">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onEdit();
                }}
              >
                <Svg d="M4 20h4L19 9l-4-4L4 16zM13 7l4 4" />
                {t("Düzenle")}
              </button>
              <button
                type="button"
                role="menuitem"
                className="is-danger"
                onClick={() => {
                  setMenuOpen(false);
                  setConfirmParty(true);
                }}
              >
                <Svg d="M5 7h14M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
                {t("Sil")}
              </button>
            </div>
          )}
        </div>
      </header>

      <ul className="tx-list">
        {history.map((row) => {
          const outflow = signOf(row.type) < 0;
          return (
            <li
              key={row.id}
              ref={row.id === lastNewId ? newRowRef : undefined}
              className={`tx ${justAdded.includes(row.id) ? "is-new" : ""} ${editingId === row.id ? "is-editing" : ""}`}
            >
              <button
                className="tx-hit"
                type="button"
                aria-label={t("{type} işlemi için seçenekler", { type: t(row.type) })}
                onClick={() => {
                  // Tuş takımı açıksa ilk dokunuş yalnızca onu kapatır; seçenekler ikinci dokunuşta çıkar
                  if (keypadOpen) {
                    setKeypadOpen(false);
                    return;
                  }
                  setSelected(row);
                }}
              >
                <div className="tx-info">
                  <div className="tx-meta">
                    <strong style={{ color: ACCENT[row.type].color }}>
                      {t(row.type)}
                    </strong>
                    <span>{formatDateTime(row.date)}</span>
                    {row.account && (
                      <span className="tx-account">
                        {t(accounts.find((a) => a.id === row.account)?.name ?? "")}
                      </span>
                    )}
                  </div>
                  {row.description && <p>{row.description}</p>}
                </div>
                <span className={`tx-amount ${outflow ? "is-debt" : ""}`}>
                  {outflow ? "-" : ""}
                  {money.format(row.amount)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {history.length === 0 && <p className="tx-empty">{t("Henüz hareket yok.")}</p>}

      <div className="tx-total">
        <span>{t("TOPLAM")}</span>
        <strong>{money.format(balanceOf(transactions, customer.id))}</strong>
      </div>

      {/* Alt bölüm: işlem girişi ve tuş takımı */}
      <div ref={entryRef} className={`entry-dock ${keypadOpen ? "is-keypad-open" : ""} ${typing ? "is-typing" : ""}`}>
        {undoTx && (
          <div className="toast" role="status">
            <span>{t("İşlem silindi")}</span>
            <button type="button" onClick={undoDelete}>
              {t("Geri al")}
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
              <span>{t("İŞLEMİ DÜZENLE")}</span>
              <button type="button" onClick={cancelEdit}>
                {t("Vazgeç")}
              </button>
            </div>
          )}

          {/* Tarih ve açıklama yalnızca tuş takımı açıkken görünür; klavye kapalıyken sade kalır */}
          {(keypadOpen || typing) && (
            <>
            <div className="entry-field">
              {dateValue ? (
                <input
                  type="datetime-local"
                  aria-label={t("Tarih")}
                  value={dateValue}
                  onChange={(e) => setDateValue(e.target.value)}
                />
              ) : (
                <button
                  className="entry-placeholder"
                  type="button"
                  onClick={() => setDateValue(toLocalInput(new Date().toISOString()))}
                >
                  {t("Tarih: şimdi")}
                </button>
              )}
              {/* Tarih seçiliyse tarayıcının kendi takvim ikonu yeterli */}
              {!dateValue && (
                <button
                  className="entry-icon"
                  type="button"
                  aria-label={t("Tarih seç")}
                  onClick={() => setDateValue(toLocalInput(new Date().toISOString()))}
                >
                  <Svg d="M4 5h16v15H4zM4 10h16M8 3v4M16 3v4" />
                </button>
              )}
            </div>

            <div className="entry-desc">
              <textarea
                placeholder={t("Açıklama")}
                aria-label={t("Açıklama")}
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onFocus={() => {
                  setTyping(true);
                  setKeypadOpen(false);
                }}
                onBlur={() => setTyping(false)}
              />
            </div>
            </>
          )}

          <div className="entry-amount">
            <button
              className="entry-icon"
              type="button"
              aria-label={t("Tuş takımını aç")}
              onClick={() => setKeypadOpen((open) => !open)}
            >
              <Svg d="M6 3h12v18H6zM9 7h6M9 11h1M12 11h1M15 11h1M9 15h1M12 15h1M15 15h1" />
            </button>
            <button
              className={`amount-field ${amount ? "" : "is-empty"}`}
              type="button"
              aria-label={t("Tutar")}
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
              {editingId ? t("GÜNCELLE") : t("EKLE")}
            </button>
          </div>

          <div className="entry-tabs" role="tablist" aria-label={t("İşlem türü")}>
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
                {t(type)}
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

      {menu === "share" && (
        <div className="action-backdrop" data-keep-keypad onClick={() => setMenu(null)}>
          <div
            className="action-sheet share-sheet"
            role="dialog"
            aria-label={t("Paylaş")}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="action-handle" aria-hidden="true" />
            <h2 className="share-title">{t("PAYLAŞ")}</h2>
            <button type="button" className="share-option" onClick={() => void sendStatement()}>
              <Svg d="M12 3v12M8 7l4-4 4 4M5 13v6h14v-6" />
              <span>
                <strong>{t("Hesap Paylaş")}</strong>
                <small>{t("Hesap özetini telefonunuzdaki uygulamalardan biriyle gönderin")}</small>
              </span>
            </button>
            <button
              type="button"
              className="share-option"
              onClick={() => {
                setMenu(null);
                setStatementOpen(true);
              }}
            >
              <Svg d="M6 3h9l4 4v14H6zM14 3v5h5M9 13h6M9 17h6" />
              <span>
                <strong>{t("PDF oluştur")}</strong>
                <small>{t("Ayrıntılı işlem listesi içeren hesap ekstresini PDF olarak oluşturun")}</small>
              </span>
            </button>
            <button type="button" className="share-close" onClick={() => setMenu(null)}>
              {t("Kapat")}
            </button>
          </div>
        </div>
      )}

      {statementOpen && (
        <StatementSheet input={statementInput} onClose={() => setStatementOpen(false)} />
      )}
      {shareNote && (
        <div className="toast" role="status">
          <span>{shareNote}</span>
        </div>
      )}

      {confirmParty && (
        <div className="action-backdrop" data-keep-keypad onClick={() => setConfirmParty(false)}>
          <div
            className="action-sheet is-centered"
            role="alertdialog"
            aria-label={t("Silme onayı")}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="action-handle" aria-hidden="true" />
            <h2 className="sheet-title">{customer.name}</h2>
            <p className="sheet-note">
              {t("Bu kaydı ve tüm işlemlerini silmek istediğinize emin misiniz? Bu işlem geri alınamaz.")}
            </p>
            <button
              className="danger-btn"
              type="button"
              onClick={() => {
                haptic("warning");
                onDeleteParty();
              }}
            >
              {t("EVET, SİL")}
            </button>
            <button
              className="action-btn is-cancel"
              type="button"
              autoFocus
              onClick={() => setConfirmParty(false)}
            >
              {t("Vazgeç")}
            </button>
          </div>
        </div>
      )}

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
            aria-label={t("İşlem seçenekleri")}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="action-handle" aria-hidden="true" />
            <div className="action-summary">
              <div className="tx-meta">
                <strong style={{ color: ACCENT[selected.type].color }}>
                  {t(selected.type)}
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
            {confirmingDelete ? (
              <>
                <p className="sheet-note">
                  {t("Bu işlemi silmek istediğinize emin misiniz?")}
                </p>
                <button
                  className="danger-btn"
                  type="button"
                  onClick={() => remove(selected)}
                >
                  {t("EVET, SİL")}
                </button>
                <button
                  className="action-btn is-cancel"
                  type="button"
                  autoFocus
                  onClick={() => setConfirmingDelete(false)}
                >
                  {t("Vazgeç")}
                </button>
              </>
            ) : (
              <>
                <button
                  className="action-btn"
                  type="button"
                  onClick={() => startEdit(selected)}
                >
                  <Svg d="M4 20h4L19 9l-4-4L4 16zM13 7l4 4" />
                  {t("Düzenle")}
                </button>
                <button
                  className="action-btn is-danger"
                  type="button"
                  onClick={() => {
                    haptic("warning");
                    setConfirmingDelete(true);
                  }}
                >
                  <Svg d="M5 7h14M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
                  {t("Sil")}
                </button>
                <button
                  className="action-btn is-cancel"
                  type="button"
                  onClick={() => setSelected(null)}
                >
                  {t("Vazgeç")}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Tahsilat ve ödemede: nakit mi, banka mı? */}
      {asking && (
        <div
          className="action-backdrop"
          data-keep-keypad
          onClick={() => setAsking(null)}
        >
          <div
            className="action-sheet is-centered"
            role="dialog"
            aria-label={t("Hesap seç")}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="action-handle" aria-hidden="true" />
            <h2 className="sheet-title">
              {asking.type === "TAHSİLAT"
                ? t("Tahsilat nereye girsin?")
                : t("Ödeme nereden yapıldı?")}
            </h2>
            <p className="sheet-note">
              {asking.type === "TAHSİLAT"
                ? t("{amount} nakit mi alındı, bankaya mı geldi?", { amount: money.format(asking.amount) })
                : t("{amount} nakit mi ödendi, bankadan mı çıktı?", { amount: money.format(asking.amount) })}
            </p>
            <div className="period-options">
              {accounts.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  className={`action-btn account-btn ${
                    editingId &&
                    transactions.find((row) => row.id === editingId)?.account === a.id
                      ? "is-active"
                      : ""
                  }`}
                  onClick={() => chooseAccount(a.id)}
                >
                  <Svg d={a.id === "cash" ? CASH_ICON : BANK_ICON} />
                  {t(a.name)}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="action-btn is-cancel"
              onClick={() => setAsking(null)}
            >
              {t("Vazgeç")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
