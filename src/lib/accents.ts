import type { TxType } from "../data/mock";

/** İşlem türüne göre vurgu rengi; yazılar, panel çerçevesi ve düğmeler bunu kullanır */
export const ACCENT: Record<TxType, { color: string; fill: string; glow: string }> = {
  SATIŞ: { color: "#3c8fd9", fill: "#3c8fd9", glow: "rgba(60, 143, 217, 0.55)" },
  ALIŞ: { color: "#e4574a", fill: "#e4574a", glow: "rgba(228, 87, 74, 0.55)" },
  TAHSİLAT: { color: "#3fbf82", fill: "#3fbf82", glow: "rgba(63, 191, 130, 0.55)" },
  ÖDEME: { color: "#e8c547", fill: "#c9a227", glow: "rgba(232, 197, 71, 0.55)" },
};
