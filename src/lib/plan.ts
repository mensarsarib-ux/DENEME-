/**
 * Hesap planı. Şimdilik herkes ücretsizdir; satın alma bağlanınca burası değişir.
 * NOT: Sınırlar şu an yalnızca uygulamada kontrol ediliyor. Satın alma bağlanınca
 * plan bilgisi sunucuda tutulup sınırlar veritabanında da zorlanacak.
 */
export type Plan = "free" | "pro" | "proplus" | "premium";

/**
 * TEST KANCASI: ?plan=pro gibi bir bağlantıyla planı denemek için. Satın alma bağlanınca
 * ve sunucu tarafı zorlanınca kaldırılacak; şu an plan sınırları yalnızca istemcide olduğu için
 * bu kanca herkes için açıktır.
 */
function planFromUrl(): Plan | null {
  try {
    const p = new URLSearchParams(window.location.search).get("plan");
    return p === "free" || p === "pro" || p === "proplus" || p === "premium" ? p : null;
  } catch {
    return null;
  }
}

export const CURRENT_PLAN: Plan = planFromUrl() ?? "free";

/** Plan sınırları. Infinity = sınırsız. */
export const LIMITS: Record<
  Plan,
  {
    /** Açılabilir işletme sayısı */
    businesses: number;
    /** Sekme sayısı (Müşteriler ve Tedarikçiler dahil) */
    tabs: number;
    /** Her sekmedeki (ve Müşteriler/Tedarikçiler listesindeki) kayıt sayısı */
    itemsPerTab: number;
    /** Ekip sayısı, yönetici dahil. 0 = ekip kapalı */
    team: number;
  }
> = {
  free: { businesses: 1, tabs: 4, itemsPerTab: 10, team: 0 },
  pro: { businesses: 3, tabs: 8, itemsPerTab: 20, team: 3 },
  proplus: { businesses: 6, tabs: 10, itemsPerTab: 40, team: 5 },
  premium: { businesses: Infinity, tabs: Infinity, itemsPerTab: Infinity, team: Infinity },
};

export const PLAN_NAME: Record<Plan, string> = {
  free: "Ücretsiz",
  pro: "Pro",
  proplus: "Pro Plus",
  premium: "Premium",
};

/** Ekip özelliği açık mı? */
export function canUseTeam(plan: Plan = CURRENT_PLAN): boolean {
  return LIMITS[plan].team > 0;
}

/** Yeni işletme eklenebilir mi? (mevcut işletme sayısına göre) */
export function canAddBusiness(count: number, plan: Plan = CURRENT_PLAN): boolean {
  return count < LIMITS[plan].businesses;
}

/** Yeni sekme eklenebilir mi? (mevcut sekme sayısına göre) */
export function canAddTab(count: number, plan: Plan = CURRENT_PLAN): boolean {
  return count < LIMITS[plan].tabs;
}

/** Bir sekmeye/listeye yeni kayıt eklenebilir mi? (o listedeki kayıt sayısına göre) */
export function canAddItem(count: number, plan: Plan = CURRENT_PLAN): boolean {
  return count < LIMITS[plan].itemsPerTab;
}

/** Ekibe yeni üye eklenebilir mi? Yönetici de sayılır, bu yüzden üye sayısı en fazla team-1 olabilir. */
export function canAddTeamMember(memberCount: number, plan: Plan = CURRENT_PLAN): boolean {
  return memberCount < LIMITS[plan].team - 1;
}
