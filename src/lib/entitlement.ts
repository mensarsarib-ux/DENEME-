import { fetchPlan, loadSession, verifyPurchase } from "./cloud";
import { setCurrentPlan, type Plan } from "./plan";

/**
 * Hesabın planını sunucudan okuyup uygular ve cihaza kaydeder (açılışta ve girişten sonra, arka planda).
 * Sunucuya ulaşılamazsa son bilinen plan kalır; bu hesaba ait değilse plan ücretsizdir.
 */
export async function syncPlanFromServer(): Promise<void> {
  const session = loadSession();
  if (!session) return;
  const timeout = new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 10000));
  const result = await Promise.race([fetchPlan(session), timeout]);
  if (!result || result === "expired") return;
  let plan = result.plan;
  if (result.expired) {
    // Süresi dolmuş ücretli kayıt: abonelik yenilenmiş olabilir, Apple'a tekrar sorulur
    const again = new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 10000));
    const refreshed = await Promise.race([verifyPurchase(session), again]);
    if (refreshed && refreshed !== "expired" && "plan" in refreshed) plan = refreshed.plan;
  }
  setCurrentPlan(plan as Plan);
  try {
    if (plan === "free") localStorage.removeItem("hesabim:plan");
    else localStorage.setItem("hesabim:plan", JSON.stringify({ plan, userId: session.userId }));
  } catch {
    /* depolama erişilemiyorsa bir sonraki açılışta tekrar denenir */
  }
}
