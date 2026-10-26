/** Hesap planı. Şimdilik herkes ücretsizdir; satın alma bağlanınca burası değişir. */
export type Plan = "free" | "pro" | "proplus";

export const CURRENT_PLAN: Plan = "free";

/** Ücretsiz planda tek işletme; Pro ve Pro Plus'ta birden fazla işletme ve ekip */
export function canUseMultiBusiness(plan: Plan = CURRENT_PLAN): boolean {
  return plan !== "free";
}

/** Müşteri/tedarikçi kayıt sınırı */
export const PARTY_LIMITS: Record<Plan, number> = {
  free: 2,
  pro: 10,
  proplus: 15,
};

/** Yeni kişi eklenebilir mi? Sınır dolunca paketler sayfasına yönlendirilir */
export function canAddParty(count: number, plan: Plan = CURRENT_PLAN): boolean {
  return count < PARTY_LIMITS[plan];
}

/** Plan adı (menü kartı için) */
export const PLAN_NAME: Record<Plan, string> = {
  free: "Ücretsiz",
  pro: "Pro",
  proplus: "Pro Plus",
};
