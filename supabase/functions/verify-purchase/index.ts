// Supabase Edge Function: verify-purchase
// Satın almayı Apple'a sorar ve aktif aboneliğin planını hesabın kaydına yazar.
// transactionId gönderilmezse hesabın kayıtlı işlemi kullanılır (geri yükleme ve yenileme).

import { createClient } from "jsr:@supabase/supabase-js@2";

const PRODUCT_PLAN: Record<string, string> = {
  "com.mensar.hesabim.pro.yearly": "pro",
  "com.mensar.hesabim.proplus.yearly": "proplus",
  "com.mensar.hesabim.premium.yearly": "premium",
};
const RANK: Record<string, number> = { pro: 1, proplus: 2, premium: 3 };
const BUNDLE_ID = "com.mensar.hesabim";
// TestFlight satın almaları sandbox'tadır; yayınlanmamış uygulamada production 404 yerine hata döndürebilir.
// Bu yüzden production başarısız olursa (hangi hata olursa olsun) sandbox da denenir.
const HOSTS = ["api.storekit.itunes.apple.com", "api.storekit-sandbox.itunes.apple.com"];

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

function b64url(input: string | Uint8Array): string {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Apple'a gönderilecek JWT (ES256, .p8 anahtarıyla) */
async function appleJwt(): Promise<string> {
  const pem = Deno.env.get("APPSTORE_PRIVATE_KEY")!.replace(/\\n/g, "\n");
  const body = pem.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  const der = Uint8Array.from(atob(body), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", der, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const header = b64url(JSON.stringify({ alg: "ES256", kid: Deno.env.get("APPSTORE_KEY_ID")?.trim(), typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const payload = b64url(
    JSON.stringify({
      iss: Deno.env.get("APPSTORE_ISSUER_ID")?.trim(),
      iat: now,
      exp: now + 1200,
      aud: "appstoreconnect-v1",
      bid: BUNDLE_ID,
    }),
  );
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, new TextEncoder().encode(`${header}.${payload}`));
  return `${header}.${payload}.${b64url(new Uint8Array(sig))}`;
}

/** Apple'a önce production'dan, olmazsa sandbox'tan sorar; her denemeyi günlüğe yazar */
async function appleGet(path: string, token: string): Promise<{ data?: Record<string, unknown>; tried: string[] }> {
  const tried: string[] = [];
  for (const host of HOSTS) {
    const res = await fetch(`https://${host}${path}`, { headers: { Authorization: `Bearer ${token}` } });
    const text = await res.text();
    const line = `${host.includes("sandbox") ? "sandbox" : "production"} ${res.status} ${path.split("/")[3]} ${text.slice(0, 120)}`;
    console.log(`apple ${line}`);
    tried.push(line);
    if (res.ok) return { data: JSON.parse(text), tried };
  }
  return { tried };
}

type TxInfo = {
  productId: string;
  bundleId: string;
  expiresDate?: number;
  revocationDate?: number;
  isUpgraded?: boolean;
};

/** Apple'ın imzalı bilgisinin (JWS) yük kısmını okur */
function readJws(jws: string): Record<string, unknown> {
  const part = jws.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
  return JSON.parse(atob(part.padEnd(part.length + ((4 - (part.length % 4)) % 4), "=")));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  // Kullanıcıyı oturumundan bul
  const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) return json({ error: "unauthorized" }, 401);
  const userId = userData.user.id;

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const input = (await req.json().catch(() => ({}))) as { transactionId?: string | number };
  let transactionId = input.transactionId != null ? String(input.transactionId) : "";
  if (!transactionId) {
    // Geri yükleme / yenileme: hesabın son doğrulanmış işlemi kullanılır
    const { data } = await admin.from("entitlements").select("transaction_id").eq("user_id", userId).maybeSingle();
    transactionId = (data?.transaction_id as string | undefined) ?? "";
  }
  if (!transactionId) return json({ error: "islem_yok" }, 404);

  try {
    const token = await appleJwt();
    const now = Date.now();
    let best: { plan: string; productId: string; expires: number } | null = null;
    const consider = (info: TxInfo, active: boolean, source: string) => {
      console.log(`${source} ${info.productId} aktif=${active} bitis=${info.expiresDate} yukseltildi=${info.isUpgraded ?? false}`);
      const plan = PRODUCT_PLAN[info.productId];
      if (!plan || info.bundleId !== BUNDLE_ID || !active || info.revocationDate || info.isUpgraded) return;
      const expires = Math.max(info.expiresDate ?? 0, now + 24 * 3600 * 1000);
      if (!best || RANK[plan] > RANK[best.plan]) best = { plan, productId: info.productId, expires };
    };

    // 1) İşlemin kendisi: satın alınan ürün anında doğru gelir (yükseltmede durum servisi geride kalabilir)
    const tx = await appleGet(`/inApps/v1/transactions/${transactionId}`, token);
    if (tx.data?.signedTransactionInfo) {
      const info = readJws(tx.data.signedTransactionInfo as string) as TxInfo;
      consider(info, (info.expiresDate ?? 0) > now, "islem");
    }

    // 2) Abonelik durumu: yenilemeler ve geri yükleme için güncel durum (1: aktif, 4: ödeme ek süresi)
    const status = await appleGet(`/inApps/v1/subscriptions/${transactionId}`, token);
    const groups = (status.data?.data ?? []) as { lastTransactions?: { status?: number; signedTransactionInfo: string }[] }[];
    for (const group of groups) {
      for (const last of group.lastTransactions ?? []) {
        consider(readJws(last.signedTransactionInfo) as TxInfo, last.status === 1 || last.status === 4, "durum");
      }
    }

    if (!tx.data && !status.data) {
      return json({ error: "apple_reddetti", reason: [...tx.tried, ...status.tried].join(" | ") }, 402);
    }

    const chosen = best as { plan: string; productId: string; expires: number } | null;
    const row = chosen
      ? { plan: chosen.plan, product_id: chosen.productId, expires_at: new Date(chosen.expires).toISOString() }
      : { plan: "free", product_id: null, expires_at: null };
    const { error } = await admin.from("entitlements").upsert({
      user_id: userId,
      ...row,
      transaction_id: transactionId,
      updated_at: new Date().toISOString(),
    });
    if (error) return json({ error: "kayit_hatasi", reason: error.message }, 500);
    if (!chosen) return json({ error: "aktif_abonelik_yok" }, 402);

    return json({ plan: chosen.plan, expiresAt: row.expires_at });
  } catch (e) {
    console.log(`hata ${String(e)}`);
    return json({ error: "sunucu_hatasi", reason: String(e) }, 500);
  }
});
