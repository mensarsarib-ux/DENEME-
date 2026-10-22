import { fold } from "./search";
import type { AccountId, Customer, TxType } from "../data/mock";

/** Konuşmadan çıkarılan işlem niyeti: belirli bir tür ya da kişinin türüne göre "ekle" / "çıkar" */
export type VoiceIntent = TxType | "add" | "reduce";

export interface VoiceCommand {
  /** Adı konuşmayla eşleşen kişiler, en iyi eşleşme önde (en çok 3) */
  partyIds: string[];
  intent: VoiceIntent;
  amount: number | null;
  account: AccountId;
}

const UNITS: Record<string, number> = {
  sifir: 0, bir: 1, iki: 2, uc: 3, dort: 4, bes: 5, alti: 6, yedi: 7, sekiz: 8, dokuz: 9,
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
};
const TENS: Record<string, number> = {
  on: 10, yirmi: 20, otuz: 30, kirk: 40, elli: 50, altmis: 60, yetmis: 70, seksen: 80, doksan: 90,
  ten: 10, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
};
const HUNDRED = new Set(["yuz", "hundred"]);
const THOUSAND = new Set(["bin", "thousand", "k"]);
const MILLION = new Set(["milyon", "million"]);

/** Sayı kelimeleri: "on bin", "yüz elli", "twenty five thousand" */
function wordNumber(tokens: string[]): number | null {
  let best: number | null = null;
  for (let start = 0; start < tokens.length; start++) {
    let total = 0;
    let current = 0;
    let used = 0;
    for (let i = start; i < tokens.length; i++) {
      const w = tokens[i];
      if (w in UNITS) current += UNITS[w];
      else if (w in TENS) current += TENS[w];
      else if (HUNDRED.has(w)) current = (current || 1) * 100;
      else if (THOUSAND.has(w)) {
        total += (current || 1) * 1000;
        current = 0;
      } else if (MILLION.has(w)) {
        total += (current || 1) * 1_000_000;
        current = 0;
      } else break;
      used++;
    }
    const value = total + current;
    // Tek başına "bir", "on" gibi kelimeler isim parçası olabilir; en az iki kelime ya da büyük bir değer
    if (used > 0 && value > 0 && (used > 1 || value >= 100)) {
      if (best === null || value > best) best = value;
    }
  }
  return best;
}

/** "10.000", "10000", "10,50", "1.250,75", "10 bin" */
function digitNumber(text: string): number | null {
  const m = text.match(/(\d+(?:[.,]\d+)*)(?:\s*(bin|milyon|thousand|million|k)\b)?/);
  if (!m) return null;
  let raw = m[1];
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(raw)) raw = raw.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(raw)) raw = raw.replace(/,/g, "");
  else raw = raw.replace(",", ".");
  let value = Number(raw);
  if (!Number.isFinite(value)) return null;
  const unit = m[2];
  if (unit) value *= MILLION.has(unit) ? 1_000_000 : 1000;
  return value > 0 ? Math.round(value * 100) / 100 : null;
}

function levenshtein(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return row[b.length];
}

const words = (text: string) => fold(text).split(/[^a-z0-9]+/).filter(Boolean);

/** Konuşulan kelime isim parçasına uyuyor mu: eşit, ek almış ("ahmete") ya da bir harf yanlış duyulmuş */
function matches(spoken: string, part: string): boolean {
  if (spoken === part) return true;
  if (part.length >= 3 && spoken.startsWith(part)) return true;
  return part.length >= 5 && spoken.length >= 4 && levenshtein(spoken, part) <= 1;
}

function matchParties(spoken: string[], parties: Customer[]): string[] {
  const scored = parties
    .map((p) => {
      const parts = words(p.name).filter((w) => w.length >= 2);
      const hit = parts.filter((part) => spoken.some((s) => matches(s, part))).length;
      return { id: p.id, hit, score: parts.length ? hit / parts.length : 0 };
    })
    .filter((x) => x.hit > 0 && x.score >= 0.3)
    .sort((a, b) => b.score - a.score || b.hit - a.hit);
  if (scored.length === 0) return [];
  const best = scored[0].score;
  return scored.filter((x) => best - x.score <= 0.2).slice(0, 3).map((x) => x.id);
}

/** Komut kelimeleri tam eşleşir; kısa kökler isimlerle ("Satılmış") karışmasın diye ek aranmaz */
const has = (tokens: string[], ...list: string[]) => tokens.some((tok) => list.includes(tok));

/** Konuşma metnini (ör. "Ahmet Faruk Korkmaz'a 10.000 TL ekle") işlem komutuna çevirir */
export function parseVoice(transcript: string, parties: Customer[]): VoiceCommand {
  const folded = fold(transcript);
  const tokens = words(transcript);

  const amount = digitNumber(folded) ?? wordNumber(tokens);

  let intent: VoiceIntent = "add";
  if (has(tokens, "tahsilat", "tahsil", "tahsilatı", "tahsilati", "collection", "collect", "received", "receive")) intent = "TAHSİLAT";
  else if (has(tokens, "odeme", "odemesi", "odemeyi", "odedim", "odedik", "odedi", "ode", "payment", "paid", "pay")) intent = "ÖDEME";
  else if (has(tokens, "satis", "satisi", "satisini", "sat", "sattim", "sattik", "sale", "sold", "sell")) intent = "SATIŞ";
  else if (has(tokens, "alis", "alisi", "alisini", "alim", "satin", "purchase", "bought", "buy")) intent = "ALIŞ";
  else if (has(tokens, "cikar", "cikart", "dus", "dusur", "azalt", "sil", "subtract", "remove", "deduct", "reduce")) intent = "reduce";

  const account: AccountId = has(tokens, "banka", "bankadan", "bankaya", "havale", "eft", "kart", "bank", "card", "transfer")
    ? "bank"
    : "cash";

  // Tutar, para birimi ve komut kelimeleri isimle karışmasın
  const nameWords = tokens.filter(
    (w) => !/^\d/.test(w) && !(w in UNITS) && !(w in TENS) && !HUNDRED.has(w) && !THOUSAND.has(w) && !MILLION.has(w),
  );
  return { partyIds: matchParties(nameWords, parties), intent, amount, account };
}

/** "Ekle"/"çıkar" niyetini kişinin sekmesine göre kesin işlem türüne çevirir (müşteri: satış / tahsilat, diğerleri: alış / ödeme) */
export function resolveIntent(intent: VoiceIntent, kind: string): TxType {
  if (intent === "add") return kind === "customer" ? "SATIŞ" : "ALIŞ";
  if (intent === "reduce") return kind === "customer" ? "TAHSİLAT" : "ÖDEME";
  return intent;
}
