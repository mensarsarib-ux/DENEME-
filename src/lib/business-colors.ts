/** İşletmelerin mağaza simgesi renkleri; sırayla atanır (1., 2., 3. işletme …) */
export const BUSINESS_COLORS = ["#f5c542", "#e4574a", "#3fbf82", "#3c8fd9", "#9b7fe0", "#5fb8c9"];

/** Listedeki sıraya göre işletmenin rengi */
export function businessColor(index: number): string {
  return BUSINESS_COLORS[index % BUSINESS_COLORS.length];
}
