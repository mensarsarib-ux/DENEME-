/** Hesap planı. Şimdilik herkes ücretsizdir; satın alma bağlanınca burası değişir. */
export type Plan = "free" | "paid";

export const CURRENT_PLAN: Plan = "free";

/** Ücretsiz planda yalnızca tek işletme ve paylaşım yok */
export function canUseMultiBusiness(plan: Plan = CURRENT_PLAN): boolean {
  return plan === "paid";
}
