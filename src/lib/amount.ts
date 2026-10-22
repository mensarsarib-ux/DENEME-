/** Ekrandaki metinden tutar üretir ("12,50" ya da "12.50"); geçersizse null */
export function parseAmount(text: string): number | null {
  const value = Number(text.replace(",", "."));
  return text && Number.isFinite(value) ? value : null;
}
