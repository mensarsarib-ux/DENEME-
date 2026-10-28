import { Capacitor } from "@capacitor/core";
import { NativePurchases, PURCHASE_TYPE, type Product } from "@capgo/native-purchases";
import type { Plan } from "./plan";

/** App Store Connect'teki abonelik kimlikleri ve karşılık gelen paketler */
export const PRODUCT_PLAN: Record<string, Exclude<Plan, "free">> = {
  "com.mensar.hesabim.pro.yearly": "pro",
  "com.mensar.hesabim.proplus.yearly": "proplus",
  "com.mensar.hesabim.premium.yearly": "premium",
};

/** Plan → ürün kimliği (ters eşleme) */
export const PLAN_PRODUCT: Record<Exclude<Plan, "free">, string> = {
  pro: "com.mensar.hesabim.pro.yearly",
  proplus: "com.mensar.hesabim.proplus.yearly",
  premium: "com.mensar.hesabim.premium.yearly",
};

/** Paketler arasında yükseklik sırası: yüksek olan, aktif aboneliklerde geçerli sayılır */
const RANK: Record<Plan, number> = { free: 0, pro: 1, proplus: 2, premium: 3 };

/** Satın alma yalnızca yerel uygulamada çalışır; tarayıcıda her zaman kapalıdır */
export const purchasesAvailable = () => Capacitor.isNativePlatform();

/** Abonelik ürünlerini App Store'dan getirir (fiyat ve açıklama dahil) */
export async function loadProducts(): Promise<Product[]> {
  if (!purchasesAvailable()) return [];
  const { products } = await NativePurchases.getProducts({
    productIdentifiers: Object.keys(PRODUCT_PLAN),
    productType: PURCHASE_TYPE.SUBS,
  });
  return products;
}

/** Seçilen paketi satın alır; başarılıysa plan cihazda kaydedilir */
export async function buyPlan(plan: Exclude<Plan, "free">): Promise<void> {
  await NativePurchases.purchaseProduct({ productIdentifier: PLAN_PRODUCT[plan], productType: PURCHASE_TYPE.SUBS });
  saveEntitledPlan(plan);
}

/** Apple Kimliğinin aktif aboneliklerini okur ve en yüksek paketi cihaza kaydeder */
export async function restorePlan(): Promise<Plan> {
  if (!purchasesAvailable()) return "free";
  const { customerInfo } = await NativePurchases.restorePurchases();
  let best: Plan = "free";
  for (const id of customerInfo.activeSubscriptions) {
    const plan = PRODUCT_PLAN[id];
    if (plan && RANK[plan] > RANK[best]) best = plan;
  }
  saveEntitledPlan(best);
  return best;
}

/** Plan değişince uygulama yeniden açılır ki tüm sınırlar yeni planla hesaplansın */
function saveEntitledPlan(plan: Plan) {
  try {
    if (plan === "free") localStorage.removeItem("hesabim:plan");
    else localStorage.setItem("hesabim:plan", plan);
  } catch {
    /* depolama erişilemiyorsa bir sonraki açılışta geri yüklemek gerekir */
  }
}
