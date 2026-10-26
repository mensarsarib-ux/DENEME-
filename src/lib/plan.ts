/** Hesap planı. Şimdilik herkes ücretsizdir; satın alma bağlanınca burası değişir. */
export type Plan = "free" | "paid";

export const CURRENT_PLAN: Plan = "free";

/** Ücretsiz planda yalnızca tek işletme ve paylaşım yok */
export function canUseMultiBusiness(plan: Plan = CURRENT_PLAN): boolean {
  return plan === "paid";
}

/** Ücretsiz planda müşteri/tedarikçi kayıt sınırı */
export const FREE_PARTY_LIMIT = 10;

/** Yeni kişi eklenebilir mi? Ücretsizde sınıra kadar serbest, sonrası Pro */
export function canAddParty(count: number, plan: Plan = CURRENT_PLAN): boolean {
  return plan === "paid" || count < FREE_PARTY_LIMIT;
}
