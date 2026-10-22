import { useState } from "react";
import {
  TX_TYPES,
  balanceOf,
  transactionsOf,
  type Customer,
  type TxType,
} from "../data/mock";
import { formatDateTime, money } from "../lib/format";
import { Svg } from "./Icon";

export default function CustomerPage({
  customer,
  onBack,
}: {
  customer: Customer;
  onBack: () => void;
}) {
  const [txType, setTxType] = useState<TxType>("SATIŞ");
  const [amount, setAmount] = useState("");
  const transactions = transactionsOf(customer.id);

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
            <small>İletişim bilgisi ekle</small>
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
        {transactions.map((t) => (
          <li key={t.id} className="tx">
            <div className="tx-info">
              <div className="tx-meta">
                <strong>{t.type}</strong>
                <span>{formatDateTime(t.date)}</span>
              </div>
              <p>{t.description}</p>
            </div>
            <span className="tx-amount">{money.format(t.amount)}</span>
          </li>
        ))}
      </ul>

      {transactions.length === 0 && (
        <p className="tx-empty">Henüz hareket yok.</p>
      )}

      <div className="tx-total">
        <span>TOPLAM</span>
        <strong>{money.format(balanceOf(customer.id))}</strong>
      </div>

      <button className="help-link" type="button">
        <Svg d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5M12 17h0" />
        Yardım &amp; Öneri
      </button>

      {/* Alt bölüm: tutar girişi ve işlem türleri */}
      <footer className="entry-bar">
        <div className="entry-input">
          <input
            inputMode="decimal"
            placeholder="0,00"
            aria-label="Tutar"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <button className="save-btn" type="button">
            KAYDET
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
      </footer>
    </div>
  );
}
