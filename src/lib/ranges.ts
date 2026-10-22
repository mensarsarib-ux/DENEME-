import { monthRange, type Period } from "../data/mock";

/** Grafikte gösterilen dönem türü: günlük, haftalık, aylık, yıllık veya kullanıcının seçtiği tarih aralığı */
export type RangeMode = Period | "custom";

export const MODE_LABELS: Record<RangeMode, string> = {
  daily: "GÜNLÜK",
  weekly: "HAFTALIK",
  monthly: "AYLIK",
  yearly: "YILLIK",
  custom: "ÖZEL ARALIK",
};

/**
 * Dönemin başlangıcı (dahil) ve bitişi (hariç).
 * `offset` bugünün dönemine göre kaç dönem önce olduğunu belirtir (0: şimdiki, -1: bir önceki).
 * Hafta pazartesi başlar. Özel aralıkta `custom` aynen döner.
 */
export function rangeOf(
  mode: RangeMode,
  offset: number,
  custom: [Date, Date] | null,
  now = new Date(),
): [Date, Date] {
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();
  switch (mode) {
    case "daily":
      return [new Date(y, m, d + offset), new Date(y, m, d + offset + 1)];
    case "weekly": {
      const monday = d - ((now.getDay() + 6) % 7) + 7 * offset;
      return [new Date(y, m, monday), new Date(y, m, monday + 7)];
    }
    case "monthly":
      return monthRange(offset, now);
    case "yearly":
      return [new Date(y + offset, 0, 1), new Date(y + offset + 1, 0, 1)];
    case "custom":
      return custom ?? [new Date(y, m, 1), new Date(y, m, d + 1)];
  }
}

const upper = (text: string) => text.toLocaleUpperCase("tr-TR");

const longDate = (date: Date) =>
  date.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

const shortDate = (date: Date, withYear: boolean) =>
  date.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "short",
    ...(withYear ? { year: "numeric" } : {}),
  });

/** Grafiğin başlığı: örn. "EKİM 2026", "19 EKİ – 25 EKİ 2026", "1 EKİ 2026 – 15 EKİ 2026" */
export function titleOf(mode: RangeMode, [start, end]: [Date, Date]): string {
  // Bitiş "hariç" olduğu için gösterilen son gün bir gün öncesidir
  const last = new Date(end.getFullYear(), end.getMonth(), end.getDate() - 1);
  switch (mode) {
    case "daily":
      return upper(longDate(start));
    case "weekly":
      return upper(
        `${shortDate(start, false)} – ${shortDate(last, false)} ${last.getFullYear()}`,
      );
    case "monthly":
      return upper(
        start.toLocaleDateString("tr-TR", { month: "long", year: "numeric" }),
      );
    case "yearly":
      return String(start.getFullYear());
    case "custom":
      return upper(`${shortDate(start, true)} – ${shortDate(last, true)}`);
  }
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Tarih alanı (`<input type="date">`) için yerel "YYYY-AA-GG" değeri */
export function toDateInput(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** "YYYY-AA-GG" değerinden yerel gün başlangıcı; geçersizse null */
export function fromDateInput(value: string): Date | null {
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}
