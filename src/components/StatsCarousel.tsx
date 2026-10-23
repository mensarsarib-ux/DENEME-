import { useRef, useState } from "react";
import { accountBalance, balanceOf, monthRange, type Account, type Customer, type Transaction } from "../data/mock";
import { money } from "../lib/format";
import { t } from "../lib/i18n";
import FlowChart from "./FlowChart";

/**
 * Özet istatistikler: yana kaydırılabilir üç bölüm.
 * 1) Gelir ve gider grafiği  2) Alacak ve borç özeti  3) Kasa ve bu ayın tahsilat/ödemeleri
 */
export default function StatsCarousel({
  parties,
  transactions,
  accounts,
}: {
  parties: Customer[];
  transactions: Transaction[];
  accounts: Account[];
}) {
  const [index, setIndex] = useState(0);
  const track = useRef<HTMLDivElement>(null);

  // Alacak: pozitif bakiyeler; borç: negatif bakiyelerin mutlak toplamı
  const balances = parties.map((p) => ({ p, b: balanceOf(transactions, p.id) }));
  const receivable = balances.filter((x) => x.b > 0).reduce((s, x) => s + x.b, 0);
  const payable = balances.filter((x) => x.b < 0).reduce((s, x) => s - x.b, 0);
  const top = balances
    .filter((x) => x.b > 0)
    .sort((a, b) => b.b - a.b)
    .slice(0, 3);

  // Bu ay tahsilat ve ödeme toplamları
  const [start, end] = monthRange(0);
  const inMonth = transactions.filter((tx) => {
    const d = new Date(tx.date).getTime();
    return d >= start.getTime() && d < end.getTime();
  });
  const collected = inMonth.filter((tx) => tx.type === "TAHSİLAT").reduce((s, tx) => s + tx.amount, 0);
  const paid = inMonth.filter((tx) => tx.type === "ÖDEME").reduce((s, tx) => s + tx.amount, 0);
  const cash = accountBalance(transactions, accounts, "cash");
  const bank = accountBalance(transactions, accounts, "bank");

  const onScroll = () => {
    const el = track.current;
    if (!el) return;
    setIndex(Math.round(el.scrollLeft / el.clientWidth));
  };

  return (
    <div className="stats-carousel">
      <div className="stats-track" ref={track} onScroll={onScroll}>
        <div className="stats-slide">
          <FlowChart transactions={transactions} />
        </div>

        <div className="stats-slide">
          <section className="card" aria-label={t("Alacak ve borç")}>
            <h2 className="card-title">{t("ALACAK VE BORÇ")}</h2>
            <dl className="stat-list">
              <div>
                <dt>{t("Toplam alacak")}</dt>
                <dd className="is-in">{money.format(receivable)}</dd>
              </div>
              <div>
                <dt>{t("Toplam borç")}</dt>
                <dd className="is-out">{money.format(payable)}</dd>
              </div>
            </dl>
            <p className="card-empty">{t("En yüksek alacaklar")}</p>
            <dl className="stat-list">
              {top.length === 0 && <div><dt>{t("Henüz alacak yok.")}</dt></div>}
              {top.map(({ p, b }) => (
                <div key={p.id}>
                  <dt>{p.name}</dt>
                  <dd className="is-in">{money.format(b)}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>

        <div className="stats-slide">
          <section className="card" aria-label={t("Kasa ve bu ay")}>
            <h2 className="card-title">{t("KASA VE BU AY")}</h2>
            <dl className="stat-list">
              <div>
                <dt>{t("Nakit")}</dt>
                <dd>{money.format(cash)}</dd>
              </div>
              <div>
                <dt>{t("Banka")}</dt>
                <dd>{money.format(bank)}</dd>
              </div>
            </dl>
            <p className="card-empty">{t("Bu ay")}</p>
            <dl className="stat-list">
              <div>
                <dt>{t("Tahsilat")}</dt>
                <dd className="is-in">{money.format(collected)}</dd>
              </div>
              <div>
                <dt>{t("Ödeme")}</dt>
                <dd className="is-out">{money.format(paid)}</dd>
              </div>
            </dl>
          </section>
        </div>
      </div>

      <div className="stats-dots" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span key={i} className={`stats-dot ${i === index ? "is-on" : ""}`} />
        ))}
      </div>
    </div>
  );
}
