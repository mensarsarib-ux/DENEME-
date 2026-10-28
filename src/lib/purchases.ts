import { Capacitor } from "@capacitor/core";
import { NativePurchases, PURCHASE_TYPE, type Product } from "@capgo/native-purchases";
import type { Plan } from "./plan";
import { loadSession, verifyPurchase } from "./cloud";

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

/** Seçilen paketi satın alır; Apple'dan gelen işlem sunucuda doğrulanır, plan ancak onaydan sonra açılır */
export async function buyPlan(plan: Exclude<Plan, "free">): Promise<void> {
  const tx = await NativePurchases.purchaseProduct({
    productIdentifier: PLAN_PRODUCT[plan],
    productType: PURCHASE_TYPE.SUBS,
  });
  try {
    localStorage.setItem("hesabim:transaction", tx.transactionId);
  } catch {
    /* geri yükleme için kayıt tutulamadı */
  }
  await confirmWithServer(tx.transactionId);
}

/** Sunucuda doğrulanan planı kaydeder; doğrulanamazsa hata fırlatır */
async function confirmWithServer(transactionId: string): Promise<Plan> {
  const session = loadSession();
  if (!session) throw new Error("Satın alma için giriş yapmanız gerekiyor");
  const result = await verifyPurchase(session, transactionId);
  if (result === "expired") throw new Error("Oturumunuzun süresi doldu, yeniden giriş yapın");
  if (!result) throw new Error("Satın alma doğrulanamadı");
  const plan = result.plan as Plan;
  saveEntitledPlan(plan);
  return plan;
}

/** Geri yükleme: Apple Kimliğindeki aktif aboneliği, son satın alma kaydı üzerinden sunucuda doğrular */
export async function restorePlan(): Promise<Plan> {
  if (!purchasesAvailable()) return "free";
  const { customerInfo } = await NativePurchases.restorePurchases();
  const hasActive = customerInfo.activeSubscriptions.some((id) => PRODUCT_PLAN[id]);
  if (!hasActive) {
    saveEntitledPlan("free");
    return "free";
  }
  let transactionId: string | null = null;
  try {
    transactionId = localStorage.getItem("hesabim:transaction");
  } catch {
    transactionId = null;
  }
  if (!transactionId) throw new Error("Geri yüklenecek işlem bu cihazda bulunamadı");
  return await confirmWithServer(transactionId);
}

/** Plan değişince uygulama yeniden açılır ki tüm sınırlar yeni planla hesaplansın */
function saveEntitledPlan(plan: Plan) {
  try {
    const userId = loadSession()?.userId;
    if (plan === "free" || !userId) localStorage.removeItem("hesabim:plan");
    else localStorage.setItem("hesabim:plan", JSON.stringify({ plan, userId }));
  } catch {
    /* depolama erişilemiyorsa bir sonraki açılışta geri yüklemek gerekir */
  }
}
