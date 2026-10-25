import { useRef, useState } from "react";
import type { Customer, Transaction } from "../data/mock";
import FlowChart from "./FlowChart";
import ColumnChart from "./ColumnChart";
import ReceivablePie from "./ReceivablePie";

const PAGES = 3;

/**
 * Özet istatistik: yana kaydırılabilir iki sayfa (gelir/gider grafiği ve aylık sütun grafiği).
 * Alanın yüksekliği değişmez; nokta göstergeleri kartın altına, üst üste biner.
 */
export default function StatsCarousel({
  transactions,
  parties,
}: {
  transactions: Transaction[];
  parties: Customer[];
}) {
  const [index, setIndex] = useState(0);
  const track = useRef<HTMLDivElement>(null);

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
          <ColumnChart transactions={transactions} />
        </div>
        <div className="stats-slide">
          <ReceivablePie parties={parties} transactions={transactions} />
        </div>
      </div>
      <div className="stats-dots" aria-hidden="true">
        {Array.from({ length: PAGES }, (_, i) => (
          <span key={i} className={`stats-dot ${i === index ? "is-on" : ""}`} />
        ))}
      </div>
    </div>
  );
}
