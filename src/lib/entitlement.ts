import { fetchPlan, loadSession } from "./cloud";

/**
 * Açılışta hesabın planını sunucudan okuyup cihaza kaydeder. Sunucuya ulaşılamazsa
 * önceki kayıt kullanılır; bu hesaba ait değilse plan ücretsiz kalır.
 */
export async function syncPlanFromServer(): Promise<void> {
  const session = loadSession();
  if (!session) return;
  const timeout = new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 3000));
  const result = await Promise.race([fetchPlan(session), timeout]);
  if (!result || result === "expired") return;
  try {
    if (result.plan === "free") localStorage.removeItem("hesabim:plan");
    else localStorage.setItem("hesabim:plan", JSON.stringify({ plan: result.plan, userId: session.userId }));
  } catch {
    /* depolama erişilemiyorsa bir sonraki açılışta tekrar denenir */
  }
}
