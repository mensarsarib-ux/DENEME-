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
  const confirmed = await confirmWithServer(String(tx.transactionId));
  if (confirmed === "free") throw new Error("Apple bu hesap için aktif abonelik göstermedi");
}

/**
 * Sunucuda doğrulanan planı kaydeder. transactionId yoksa sunucu hesabın kayıtlı işlemini kullanır.
 * Aktif abonelik ya da kayıtlı işlem yoksa plan ücretsizdir; diğer hatalarda sebep yazılır.
 */
async function confirmWithServer(transactionId?: string): Promise<Plan> {
  const session = loadSession();
  if (!session) throw new Error("Satın alma için giriş yapmanız gerekiyor");
  const result = await verifyPurchase(session, transactionId);
  if (result === "expired") throw new Error("Oturumunuzun süresi doldu, yeniden giriş yapın");
  if ("error" in result) {
    if (result.error.startsWith("aktif_abonelik_yok") || result.error.startsWith("islem_yok")) {
      saveEntitledPlan("free");
      return "free";
    }
    throw new Error(`Satın alma doğrulanamadı: ${result.error}`);
  }
  const plan = result.plan as Plan;
  saveEntitledPlan(plan);
  return plan;
}

/**
 * Geri yükleme: Apple ile eşitlenir, sonra hesabın sunucudaki işlemi Apple'a tekrar sorulur.
 * (Eklentinin iOS'taki geri yükleme sonucu boş döndüğü için abonelik bilgisi oradan okunmaz.)
 */
export async function restorePlan(): Promise<Plan> {
  if (!purchasesAvailable()) return "free";
  try {
    await NativePurchases.restorePurchases();
  } catch (e) {
    throw new Error(`Apple geri yükleme hatası: ${String(e)}`);
  }
  return await confirmWithServer();
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
