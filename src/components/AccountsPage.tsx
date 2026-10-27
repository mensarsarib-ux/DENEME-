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
import { t } from "../lib/i18n";
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
        title={t("Hesaplarım")}
        subtitle={t("Toplam {amount}", { amount: money.format(cashTotal(transactions, accounts)) })}
        icon={ICON}
        onBack={onBack}
      />

      <div className="stack">
        {accounts.map((a) => {
          const moves = movementsOf(transactions, a.id);
          const incoming = moves.filter((m) => m.type === "TAHSİLAT").reduce((s, m) => s + m.amount, 0);
          const outgoing = moves.filter((m) => m.type === "ÖDEME").reduce((s, m) => s + m.amount, 0);
          return (
            <section key={a.id} className="card" aria-label={t(a.name)}>
              <div className="card-head">
                <h2>{t(a.name)}</h2>
                <strong className="card-amount">
                  {money.format(accountBalance(transactions, accounts, a.id))}
                </strong>
              </div>
              <dl className="stat-list">
                <div><dt>{t("Açılış bakiyesi")}</dt><dd>{money.format(a.opening)}</dd></div>
                <div><dt>{t("Toplam tahsilat")}</dt><dd className="is-in">{money.format(incoming)}</dd></div>
                <div><dt>{t("Toplam ödeme")}</dt><dd className="is-out">{money.format(outgoing)}</dd></div>
                <div><dt>{t("Hareket sayısı")}</dt><dd>{moves.length}</dd></div>
              </dl>
              <div className="card-actions">
                <button type="button" className="action-btn" onClick={() => onOpenKasa(a.id)}>
                  {t("Hareketleri gör")}
                </button>
                <button type="button" className="action-btn" onClick={() => startEdit(a)}>
                  {t("Açılış bakiyesini düzenle")}
                </button>
              </div>
            </section>
          );
        })}
      </div>

      {editing && (
        <div className="action-backdrop is-high" onClick={() => setEditing(null)}>
          <form
            className="action-sheet is-centered"
            role="dialog"
            aria-label={t("{name} açılış bakiyesi", { name: t(editing.name) })}
            onClick={(e) => e.stopPropagation()}
            onSubmit={submit}
            noValidate
          >
            <div className="action-handle" aria-hidden="true" />
            <h2 className="sheet-title">{t("{name} açılış bakiyesi", { name: t(editing.name) })}</h2>
            <p className="sheet-note">
              {t("Hesabın başlangıç tutarı. Bakiye, bu tutara tahsilatlar eklenip ödemeler çıkarılarak hesaplanır.")}
            </p>
            <div className="field">
              <label htmlFor="opening">{t("Açılış bakiyesi")} ({currencySymbol()})</label>
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
                <p className="form-error" role="alert">{t("Geçerli bir tutar yazın.")}</p>
              )}
            </div>
            <button className="primary-btn" type="submit" disabled={!valid}>{t("KAYDET")}</button>
            <button className="action-btn is-cancel" type="button" onClick={() => setEditing(null)}>{t("Vazgeç")}</button>
          </form>
        </div>
      )}
    </div>
  );
}
