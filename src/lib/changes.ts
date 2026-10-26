import { money } from "./format";

type Row = Record<string, unknown> & { id: string };

function list(snapshot: Record<string, unknown> | null, key: string): Row[] {
  const v = snapshot?.[key];
  return Array.isArray(v) ? (v as Row[]) : [];
}

const TYPE_LABEL: Record<string, string> = { SATIŞ: "Satış", ALIŞ: "Alış", TAHSİLAT: "Tahsilat", ÖDEME: "Ödeme" };

/**
 * İki veri anlık görüntüsü arasındaki farkı Türkçe cümlelere çevirir.
 * Örnek: "Yeni işlem: Satış ₺500,00 — Ahmet Yılmaz"
 */
export function describeChanges(prev: Record<string, unknown> | null, next: Record<string, unknown>): string[] {
  const out: string[] = [];
  const prevParties = new Map(list(prev, "parties").map((p) => [p.id, p]));
  const nextParties = new Map(list(next, "parties").map((p) => [p.id, p]));
  const nameOf = (id: unknown) => String(nextParties.get(String(id))?.name ?? prevParties.get(String(id))?.name ?? "");

  for (const [id, p] of nextParties) {
    const old = prevParties.get(id);
    if (!old) out.push(`Yeni kişi: ${String(p.name)}`);
    else if (JSON.stringify(old) !== JSON.stringify(p)) out.push(`Kişi düzenlendi: ${String(p.name)}`);
  }
  for (const [id, p] of prevParties) {
    if (!nextParties.has(id)) out.push(`Kişi silindi: ${String(p.name)}`);
  }

  const prevTx = new Map(list(prev, "transactions").map((t) => [t.id, t]));
  const nextTx = new Map(list(next, "transactions").map((t) => [t.id, t]));
  const label = (t: Row) => `${TYPE_LABEL[String(t.type)] ?? String(t.type)} ${money.format(Number(t.amount))} — ${nameOf(t.customerId)}`;

  for (const [id, t] of nextTx) {
    const old = prevTx.get(id);
    if (!old) out.push(`Yeni işlem: ${label(t)}`);
    else if (JSON.stringify(old) !== JSON.stringify(t)) out.push(`İşlem düzenlendi: ${label(t)}`);
  }
  for (const [id, t] of prevTx) {
    if (!nextTx.has(id)) out.push(`İşlem silindi: ${label(t)}`);
  }
  return out;
}
