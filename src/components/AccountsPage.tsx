import { useState, type FormEvent } from "react";
import {
  accountBalance,
  cashTotal,
  movementsOf,
  type Account,
  type AccountId,
  type Transaction,
} from "../data/mock";
import { currencySymbol, money } from "../lib/format";
import { haptic } from "../lib/haptics";
import { MENU_ITEMS } from "../lib/menu";
import PageHeader from "./PageHeader";

const ICON = MENU_ITEMS[1].icon;

/** Hesaplarım: nakit ve banka bakiyeleri, toplam giriş/çıkış, açılış bakiyesini düzenleme */
export default function AccountsPage({
  accounts,
  transactions,
  onUpdateOpening,
  onOpenKasa,
  onBack,
}: {
  accounts: Account[];
  transactions: Transaction[];
  onUpdateOpening: (id: AccountId, opening: number) => void;
  /** Hareketleri gör: Kasa sayfasında o hesap açılır */
  onOpenKasa: (id: AccountId) => void;
  onBack: () => void;
}) {
  const [editing, setEditing] = useState<Account | null>(null);
  const [text, setText] = useState("");

  const parsed = Number(text.replace(",", "."));
  const valid = text.trim() !== "" && Number.isFinite(parsed);

  function startEdit(account: Account) {
    setEditing(account);
    setText(String(account.opening).replace(".", ","));
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!editing || !valid) return;
    haptic("success");
    onUpdateOpening(editing.id, parsed);
    setEditing(null);
  }

  return (
    <div className="cust-page">
      <PageHeader
        title="Hesaplarım"
        subtitle={`Toplam ${money.format(cashTotal(transactions, accounts))}`}
        icon={ICON}
        onBack={onBack}
      />

      <div className="stack">
        {accounts.map((a) => {
          const moves = movementsOf(transactions, a.id);
          const incoming = moves.filter((m) => m.type === "TAHSİLAT").reduce((s, m) => s + m.amount, 0);
          const outgoing = moves.filter((m) => m.type === "ÖDEME").reduce((s, m) => s + m.amount, 0);
          return (
            <section key={a.id} className="card" aria-label={a.name}>
              <div className="card-head">
                <h2>{a.name}</h2>
                <strong className="card-amount">
                  {money.format(accountBalance(transactions, accounts, a.id))}
                </strong>
              </div>
              <dl className="stat-list">
                <div><dt>Açılış bakiyesi</dt><dd>{money.format(a.opening)}</dd></div>
                <div><dt>Toplam tahsilat</dt><dd className="is-in">{money.format(incoming)}</dd></div>
                <div><dt>Toplam ödeme</dt><dd className="is-out">{money.format(outgoing)}</dd></div>
                <div><dt>Hareket sayısı</dt><dd>{moves.length}</dd></div>
              </dl>
              <div className="card-actions">
                <button type="button" className="action-btn" onClick={() => onOpenKasa(a.id)}>
                  Hareketleri gör
                </button>
                <button type="button" className="action-btn" onClick={() => startEdit(a)}>
                  Açılış bakiyesini düzenle
                </button>
              </div>
            </section>
          );
        })}
      </div>

      {editing && (
        <div className="action-backdrop" onClick={() => setEditing(null)}>
          <form
            className="action-sheet is-centered"
            role="dialog"
            aria-label={`${editing.name} açılış bakiyesi`}
            onClick={(e) => e.stopPropagation()}
            onSubmit={submit}
            noValidate
          >
            <div className="action-handle" aria-hidden="true" />
            <h2 className="sheet-title">{editing.name} açılış bakiyesi</h2>
            <p className="sheet-note">
              Hesabın başlangıç tutarı. Bakiye, bu tutara tahsilatlar eklenip ödemeler çıkarılarak hesaplanır.
            </p>
            <div className="field">
              <label htmlFor="opening">Açılış bakiyesi ({currencySymbol()})</label>
              <input
                id="opening"
                autoFocus
                inputMode="decimal"
                autoComplete="off"
                value={text}
                onChange={(e) => setText(e.target.value)}
                aria-invalid={text.trim() !== "" && !valid ? true : undefined}
              />
              {text.trim() !== "" && !valid && (
                <p className="form-error" role="alert">Geçerli bir tutar yazın.</p>
              )}
            </div>
            <button className="primary-btn" type="submit" disabled={!valid}>KAYDET</button>
            <button className="action-btn is-cancel" type="button" onClick={() => setEditing(null)}>Vazgeç</button>
          </form>
        </div>
      )}
    </div>
  );
}
