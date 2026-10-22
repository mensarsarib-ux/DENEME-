import { useState } from "react";
import { cashTotal, type Account, type Customer, type Transaction } from "../data/mock";
import { money } from "../lib/format";
import { haptic } from "../lib/haptics";
import { MENU_ITEMS } from "../lib/menu";
import {
  REPORT_PERIODS,
  buildReport,
  reportText,
  type RankedParty,
  type ReportPeriod,
} from "../lib/reports";
import PageHeader from "./PageHeader";

const ICON = MENU_ITEMS[2].icon;

function Ranking({
  title,
  rows,
  empty,
  onOpenParty,
}: {
  title: string;
  rows: RankedParty[];
  empty: string;
  onOpenParty: (id: string) => void;
}) {
  const max = Math.max(...rows.map((r) => r.amount), 1);
  return (
    <section className="card" aria-label={title}>
      <h2 className="card-title">{title}</h2>
      {rows.length === 0 ? (
        <p className="card-empty">{empty}</p>
      ) : (
        <ol className="rank-list">
          {rows.map((r, i) => (
            <li key={r.id}>
              <button type="button" className="rank-row" onClick={() => onOpenParty(r.id)}>
                <span className="rank-no">{i + 1}</span>
                <span className="rank-body">
                  <span className="rank-top">
                    <span className="rank-name">{r.name}</span>
                    <span className="rank-amount">{money.format(r.amount)}</span>
                  </span>
                  <span className="rank-track">
                    <span className="rank-fill" style={{ width: `${(r.amount / max) * 100}%` }} />
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

/** Raporlar: dönem seçilir; gelir, gider, net, tahsilat, alacak/borç ve en çok işlem yapılanlar görünür */
export default function ReportsPage({
  parties,
  transactions,
  accounts,
  businessName,
  onOpenParty,
  onBack,
}: {
  parties: Customer[];
  transactions: Transaction[];
  accounts: Account[];
  businessName: string;
  onOpenParty: (id: string) => void;
  onBack: () => void;
}) {
  const [period, setPeriod] = useState<ReportPeriod>("month");
  const [copied, setCopied] = useState<"ok" | "fail" | null>(null);

  const report = buildReport(parties, transactions, period);
  const label = REPORT_PERIODS.find((p) => p.value === period)?.label ?? "";
  const net = report.totals.satis - report.totals.alis;
  const text = reportText(businessName || "Hesabım", label, report);

  async function copy() {
    haptic("light");
    try {
      await navigator.clipboard.writeText(text);
      setCopied("ok");
    } catch {
      // Panoya yazılamadıysa metin seçilebilir olarak gösterilir
      setCopied("fail");
    }
  }

  return (
    <div className="cust-page">
      <PageHeader title="Raporlar" subtitle={`${label} özeti`} icon={ICON} onBack={onBack} />

      <div className="chip-row" role="tablist" aria-label="Rapor dönemi">
        {REPORT_PERIODS.map((p) => (
          <button
            key={p.value}
            role="tab"
            aria-selected={period === p.value}
            className={`chip ${period === p.value ? "is-active" : ""}`}
            onClick={() => {
              haptic("light");
              setPeriod(p.value);
              setCopied(null);
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="stack">
        <section className="card" aria-label="Gelir ve gider">
          <div className="card-head">
            <h2>Net sonuç</h2>
            <strong className={`card-amount ${net < 0 ? "is-out" : "is-in"}`}>{money.format(net)}</strong>
          </div>
          <dl className="stat-list">
            <div><dt>Gelir (satış)</dt><dd className="is-in">{money.format(report.totals.satis)}</dd></div>
            <div><dt>Gider (alış)</dt><dd className="is-out">{money.format(report.totals.alis)}</dd></div>
            <div><dt>Tahsilat</dt><dd>{money.format(report.totals.tahsilat)}</dd></div>
          </dl>
        </section>

        <section className="card" aria-label="Alacak ve borç">
          <h2 className="card-title">Güncel durum</h2>
          <dl className="stat-list">
            <div><dt>Toplam alacak</dt><dd className="is-in">{money.format(report.receivable)}</dd></div>
            <div><dt>Toplam borç</dt><dd className="is-out">{money.format(report.payable)}</dd></div>
            <div><dt>Kasa (nakit + banka)</dt><dd>{money.format(cashTotal(transactions, accounts))}</dd></div>
          </dl>
        </section>

        <Ranking
          title="En çok satış yapılan müşteriler"
          rows={report.topCustomers}
          empty="Bu dönemde satış yok."
          onOpenParty={onOpenParty}
        />
        <Ranking
          title="En çok alış yapılanlar"
          rows={report.topSuppliers}
          empty="Bu dönemde alış yok."
          onOpenParty={onOpenParty}
        />

        <button type="button" className="primary-btn" onClick={copy}>
          RAPORU KOPYALA
        </button>
        {copied === "ok" && <p className="form-success" role="status">Rapor panoya kopyalandı.</p>}
        {copied === "fail" && (
          <div>
            <p className="field-hint">Kopyalanamadı. Metni seçip kopyalayabilirsiniz:</p>
            <textarea className="copy-box" readOnly rows={10} value={text} onFocus={(e) => e.currentTarget.select()} />
          </div>
        )}
      </div>
    </div>
  );
}

