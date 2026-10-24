import type { Transaction } from "../data/mock";
import FlowChart from "./FlowChart";

/** Özet istatistik: yalnızca gelir ve gider grafiği */
export default function StatsCarousel({ transactions }: { transactions: Transaction[] }) {
  return (
    <div className="stats-carousel">
      <FlowChart transactions={transactions} />
    </div>
  );
}
