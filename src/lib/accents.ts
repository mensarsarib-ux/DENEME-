import type { EntryKind } from "../data/mock";

/** İşlem türüne göre vurgu rengi; yazılar, panel çerçevesi ve düğmeler bunu kullanır */
export const ACCENT: Record<EntryKind, { color: string; fill: string; glow: string }> = {
  SATIŞ: { color: "#3c8fd9", fill: "#3c8fd9", glow: "rgba(60, 143, 217, 0.55)" },
  ALIŞ: { color: "#e4574a", fill: "#e4574a", glow: "rgba(228, 87, 74, 0.55)" },
  TAHSİLAT: { color: "#3fbf82", fill: "#3fbf82", glow: "rgba(63, 191, 130, 0.55)" },
  ÖDEME: { color: "#e8c547", fill: "#c9a227", glow: "rgba(232, 197, 71, 0.55)" },
  DEVİR: { color: "#a786f2", fill: "#8f6be8", glow: "rgba(167, 134, 242, 0.55)" },
  İADE: { color: "#f0913f", fill: "#e07f2c", glow: "rgba(240, 145, 63, 0.55)" },
  İNDİRİM: { color: "#e06bb0", fill: "#d4589f", glow: "rgba(224, 107, 176, 0.55)" },
};
