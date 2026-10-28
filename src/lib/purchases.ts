import { Capacitor } from "@capacitor/core";
import { NativePurchases, PURCHASE_TYPE, type Product } from "@capgo/native-purchases";
import { setCurrentPlan, type Plan } from "./plan";
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
  // Ödeme alınmadan önce giriş kontrol edilir; paket hesaba bağlanacağı için giriş şarttır
  if (!loadSession()) throw new Error("Paket almak için önce hesabınıza giriş yapın");
  const tx = await NativePurchases.purchaseProduct({
    productIdentifier: PLAN_PRODUCT[plan],
    productType: PURCHASE_TYPE.SUBS,
  });
  const id = String(tx.transactionId);
  // Sunucuya ulaşılamazsa satın alma kaybolmasın: işlem, doğrulanana kadar cihazda bekletilir
  savePendingTransaction(id);
  const confirmed = await confirmWithServer(id);
  if (confirmed === "free") throw new Error("Apple bu hesap için aktif abonelik göstermedi");
}

/**
 * Telefondaki Apple hesabının şu an geçerli aboneliği (en üst paket). Hesabın sunucudaki kaydı eski ya da
 * başka bir Apple hesabına ait olabilir; geri yüklemede ve "zaten abonesiniz" durumunda asıl kaynak budur.
 * (Metot, scripts/patch-native-purchases.cjs ile eklentiye eklenir.)
 */
async function deviceTransactionId(): Promise<string | undefined> {
  const RANK: Record<string, number> = { pro: 1, proplus: 2, premium: 3 };
  try {
    const plugin = NativePurchases as unknown as {
      getCurrentEntitlements(): Promise<{ entitlements: { transactionId: string; productIdentifier: string }[] }>;
    };
    const { entitlements } = await plugin.getCurrentEntitlements();
    let best: { id: string; rank: number } | undefined;
    for (const e of entitlements ?? []) {
      const plan = PRODUCT_PLAN[e.productIdentifier];
      if (plan && (!best || RANK[plan] > best.rank)) best = { id: String(e.transactionId), rank: RANK[plan] };
    }
    return best?.id;
  } catch {
    return undefined;
  }
}

const PENDING_KEY = "hesabim:pending-transaction";

/** Henüz sunucuda doğrulanamamış son satın alma (yalnızca aynı hesap için geçerli) */
function pendingTransaction(): string | undefined {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    const saved = raw ? (JSON.parse(raw) as { id?: string; userId?: string }) : null;
    return saved?.id && saved.userId === loadSession()?.userId ? saved.id : undefined;
  } catch {
    return undefined;
  }
}

function savePendingTransaction(id: string | null) {
  try {
    const userId = loadSession()?.userId;
    if (id && userId) localStorage.setItem(PENDING_KEY, JSON.stringify({ id, userId }));
    else localStorage.removeItem(PENDING_KEY);
  } catch {
    /* depolama erişilemiyorsa geri yükleme sunucudaki kayıtla yapılır */
  }
}

/**
 * Sunucuda doğrulanan planı kaydeder. transactionId yoksa sunucu hesabın kayıtlı işlemini kullanır.
 * Aktif abonelik ya da kayıtlı işlem yoksa plan ücretsizdir; diğer hatalarda sebep yazılır.
 */
async function confirmWithServer(transactionId?: string): Promise<Plan> {
  const session = loadSession();
  if (!session) throw new Error("Satın alma için giriş yapmanız gerekiyor");
  const result = await verifyPurchase(session, transactionId ?? pendingTransaction());
  if (result === "expired") throw new Error("Oturumunuzun süresi doldu, yeniden giriş yapın");
  if ("error" in result) {
    if (result.error.startsWith("aktif_abonelik_yok") || result.error.startsWith("islem_yok")) {
      savePendingTransaction(null);
      saveEntitledPlan("free");
      return "free";
    }
    if (result.error.startsWith("baska_hesapta")) {
      savePendingTransaction(null);
      throw new Error("Bu Apple aboneliği başka bir Hesabım hesabında kullanılıyor.");
    }
    throw new Error(`Satın alma doğrulanamadı: ${result.error}`);
  }
  savePendingTransaction(null);
  const plan = result.plan as Plan;
  saveEntitledPlan(plan);
  return plan;
}

/**
 * Şifre istemeden hesabın aboneliğini sunucuda Apple'a tekrar sordurur (kayıtlı işlem üzerinden).
 * "Zaten abonesiniz" durumunda ve paketler sayfası açılınca kullanılır; bilinmiyorsa null döner.
 */
export async function refreshPlan(fromDevice = false): Promise<Plan | null> {
  if (!purchasesAvailable() || !loadSession()) return null;
  try {
    // fromDevice: kullanıcı satın almayı denediyse telefondaki geçerli abonelik bu hesaba bağlanır
    return await confirmWithServer(fromDevice ? await deviceTransactionId() : undefined);
  } catch {
    return null;
  }
}

/**
 * Geri yükleme: Apple ile eşitlenir, sonra telefondaki geçerli abonelik (yoksa hesabın kayıtlı işlemi)
 * sunucuda Apple'a sorulur ve bu hesaba bağlanır.
 */
export async function restorePlan(): Promise<Plan> {
  if (!purchasesAvailable()) return "free";
  try {
    await NativePurchases.restorePurchases();
  } catch {
    // Apple ile eşitleme başarısız olsa da (ör. "Unable to Complete Request") abonelik sunucuda Apple'a sorulabilir
  }
  // Önce telefondaki geçerli abonelik, o yoksa hesabın kayıtlı işlemi Apple'a sorulur
  return await confirmWithServer(await deviceTransactionId());
}

/** Doğrulanan planı uygular ve hesaba bağlı olarak cihazda saklar */
function saveEntitledPlan(plan: Plan) {
  setCurrentPlan(plan);
  try {
    const userId = loadSession()?.userId;
    if (plan === "free" || !userId) localStorage.removeItem("hesabim:plan");
    else localStorage.setItem("hesabim:plan", JSON.stringify({ plan, userId }));
  } catch {
    /* depolama erişilemiyorsa bir sonraki açılışta geri yüklemek gerekir */
  }
}
