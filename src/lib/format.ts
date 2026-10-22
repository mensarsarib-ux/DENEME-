export const money = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
  minimumFractionDigits: 2,
});

/** Örn. "30 EYLÜL, 14:32" */
export function formatDateTime(iso: string): string {
  return new Date(iso)
    .toLocaleString("tr-TR", {
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    })
    .toLocaleUpperCase("tr-TR");
}
