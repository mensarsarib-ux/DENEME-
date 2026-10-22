// Türkçe karakterlere duyarsız arama: "ayse" yazınca "Ayşe" bulunur.
const FOLD: Record<string, string> = {
  ı: "i",
  ş: "s",
  ç: "c",
  ğ: "g",
  ö: "o",
  ü: "u",
  â: "a",
  î: "i",
  û: "u",
};

/** Küçük harfe çevirip aksanları sadeleştirir; metnin uzunluğu değişmez. */
export function fold(text: string): string {
  let out = "";
  for (const ch of text) {
    const lower = ch.toLocaleLowerCase("tr-TR");
    out += lower.length === ch.length ? (FOLD[lower] ?? lower) : ch;
  }
  return out;
}

export type MatchRange = [start: number, end: number];

/** İsimde aramanın geçtiği aralık; yoksa null */
export function findMatch(name: string, query: string): MatchRange | null {
  const q = fold(query.trim());
  if (!q) return null;
  const index = fold(name).indexOf(q);
  return index === -1 ? null : [index, index + q.length];
}
