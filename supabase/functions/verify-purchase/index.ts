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
  originalTransactionId?: string;
  bundleId: string;
  expiresDate?: number;
  revocationDate?: number;
  isUpgraded?: boolean;
  /** Satın alma anında uygulamanın verdiği hesap kimliği (Hesabım kullanıcı kimliği) */
  appAccountToken?: string;
};

/** Apple'ın imzalı bilgisinin (JWS) yük kısmını okur */
function readJws(jws: string): Record<string, unknown> {
  const part = jws.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
  return JSON.parse(atob(part.padEnd(part.length + ((4 - (part.length % 4)) % 4), "=")));
}

// deno-lint-ignore no-explicit-any
type Admin = any;

/**
 * Sahibin paketi yıllık yenilendiğinde kayıt ancak sahip uygulamayı açınca güncellenir. Üyeler bu arada
 * ücretsiz sınırlara düşmesin diye, üyenin isteğiyle sahibin kayıtlı aboneliği Apple'a sorulur.
 * Yalnızca sahibin kendi kayıtlı aboneliği okunur; abonelik kimseye taşınmaz. Apple'a en fazla saatte bir sorulur.
 */
async function refreshOwner(admin: Admin, userId: string, businessId: string): Promise<Response> {
  const { data: member } = await admin
    .from("business_members")
    .select("business_id")
    .eq("business_id", businessId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!member) return json({ error: "yetkisiz" }, 403);
  const { data: biz } = await admin.from("businesses").select("owner_id").eq("id", businessId).maybeSingle();
  if (!biz?.owner_id) return json({ plan: "free" });
  const owner = biz.owner_id as string;
  const { data: ent } = await admin
    .from("entitlements")
    .select("plan, expires_at, transaction_id, original_transaction_id, updated_at")
    .eq("user_id", owner)
    .maybeSingle();
  const now = Date.now();
  if (!ent?.transaction_id) return json({ plan: "free" });
  if (ent.plan !== "free" && ent.expires_at && new Date(ent.expires_at).getTime() > now) {
    return json({ plan: ent.plan, expiresAt: ent.expires_at });
  }
  if (ent.updated_at && now - new Date(ent.updated_at).getTime() < 3600 * 1000) return json({ plan: "free" });

  try {
    const token = await appleJwt();
    const status = await appleGet(`/inApps/v1/subscriptions/${ent.transaction_id}`, token);
    const groups = (status.data?.data ?? []) as { lastTransactions?: { status?: number; signedTransactionInfo: string }[] }[];
    let best: { plan: string; productId: string; expires: number } | null = null;
    for (const group of groups) {
      for (const last of group.lastTransactions ?? []) {
        const info = readJws(last.signedTransactionInfo) as TxInfo;
        const plan = PRODUCT_PLAN[info.productId];
        const active = last.status === 1 || last.status === 4;
        const same = !ent.original_transaction_id || String(info.originalTransactionId ?? "") === ent.original_transaction_id;
        if (!plan || info.bundleId !== BUNDLE_ID || !active || !same || info.revocationDate || info.isUpgraded) continue;
        if (!best || RANK[plan] > RANK[best.plan]) {
          best = { plan, productId: info.productId, expires: Math.max(info.expiresDate ?? 0, now + 24 * 3600 * 1000) };
        }
      }
    }
    const stamp = new Date().toISOString();
    if (!best) {
      await admin.from("entitlements").update({ updated_at: stamp }).eq("user_id", owner);
      console.log(`sahip yenileme: aktif abonelik yok ${owner}`);
      return json({ plan: "free" });
    }
    const chosen = best as { plan: string; productId: string; expires: number };
    const expiresAt = new Date(chosen.expires).toISOString();
    await admin
      .from("entitlements")
      .update({ plan: chosen.plan, product_id: chosen.productId, expires_at: expiresAt, updated_at: stamp })
      .eq("user_id", owner);
    console.log(`sahip yenileme: ${chosen.plan} ${owner}`);
    return json({ plan: chosen.plan, expiresAt });
  } catch (e) {
    console.log(`sahip yenileme hatası ${String(e)}`);
    return json({ error: "sunucu_hatasi" }, 500);
  }
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
  const input = (await req.json().catch(() => ({}))) as { transactionId?: string | number; ownerOf?: string };
  // Ekip üyesi: işletme sahibinin paketi süresi dolmuş görünüyorsa sahibin aboneliği Apple'a yeniden sorulur
  if (input.ownerOf) return await refreshOwner(admin, userId, String(input.ownerOf));
  let transactionId = input.transactionId != null ? String(input.transactionId) : "";
  if (!transactionId) {
    // Geri yükleme / yenileme: hesabın son doğrulanmış işlemi kullanılır
    const { data } = await admin.from("entitlements").select("transaction_id").eq("user_id", userId).maybeSingle();
    transactionId = (data?.transaction_id as string | undefined) ?? "";
  }
  if (!transactionId) return json({ error: "islem_yok" }, 404);
  // Hangi işlemin sorulduğu: telefondan gelen mi, hesabın kayıtlı işlemi mi (sorun ayıklamak için)
  console.log(`istek kaynak=${input.transactionId != null ? "telefon" : "kayit"} islem=${transactionId}`);

  try {
    const token = await appleJwt();
    const now = Date.now();
    let best: { plan: string; productId: string; expires: number; original: string; account: string } | null = null;
    const consider = (info: TxInfo, active: boolean, source: string) => {
      console.log(`${source} ${info.productId} aktif=${active} bitis=${info.expiresDate} yukseltildi=${info.isUpgraded ?? false}`);
      const plan = PRODUCT_PLAN[info.productId];
      if (!plan || info.bundleId !== BUNDLE_ID || !active || info.revocationDate || info.isUpgraded) return;
      const expires = Math.max(info.expiresDate ?? 0, now + 24 * 3600 * 1000);
      if (!best || RANK[plan] > RANK[best.plan]) {
        best = {
          plan,
          productId: info.productId,
          expires,
          original: String(info.originalTransactionId ?? ""),
          account: String(info.appAccountToken ?? "").toLowerCase(),
        };
      }
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
      // Ayrıntı yalnızca sunucu günlüğünde kalır; uygulamaya iç bilgi gönderilmez
      console.log(`apple reddetti ${[...tx.tried, ...status.tried].join(" | ")}`);
      return json({ error: "apple_reddetti" }, 402);
    }

    const chosen = best as { plan: string; productId: string; expires: number; original: string; account: string } | null;

    // Abonelik satın alınırken başka bir Hesabım hesabına bağlandıysa ve o hesapta hâlâ geçerliyse
    // bu hesaba taşınmaz. (İşlem numarasını bir şekilde ele geçiren biri başkasının aboneliğini alamaz.)
    if (chosen?.account && chosen.account !== userId.toLowerCase()) {
      const { data: holder } = await admin
        .from("entitlements")
        .select("user_id")
        .eq("user_id", chosen.account)
        .neq("plan", "free")
        .gt("expires_at", new Date().toISOString())
        .limit(1);
      if (holder && holder.length > 0) {
        console.log(`abonelik baska hesaba bagli ${chosen.original}`);
        return json({ error: "baska_hesapta" }, 409);
      }
    }

    // Aynı Apple aboneliği en son hangi Hesabım hesabında satın alındı ya da geri yüklendiyse orada geçerlidir.
    // Başka bir hesapta etkinse o hesaptan alınıp bu hesaba taşınır (aynı abonelik iki hesapta birden açık kalmaz).
    if (chosen?.original) {
      const { data: moved, error: moveError } = await admin
        .from("entitlements")
        .update({ plan: "free", expires_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("original_transaction_id", chosen.original)
        .neq("user_id", userId)
        .neq("plan", "free")
        .select("user_id");
      if (moveError) {
        console.log(`tasima hatasi ${moveError.message}`);
        return json({ error: "kayit_hatasi" }, 500);
      }
      if (moved && moved.length > 0) console.log(`abonelik ${moved.length} hesaptan bu hesaba tasindi ${chosen.original}`);
    }

    const row = chosen
      ? {
          plan: chosen.plan,
          product_id: chosen.productId,
          original_transaction_id: chosen.original || null,
          expires_at: new Date(chosen.expires).toISOString(),
        }
      : { plan: "free", product_id: null, expires_at: null };
    const { error } = await admin.from("entitlements").upsert({
      user_id: userId,
      ...row,
      transaction_id: transactionId,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      console.log(`kayit hatasi ${error.message}`);
      return json({ error: "kayit_hatasi" }, 500);
    }
    if (!chosen) return json({ error: "aktif_abonelik_yok" }, 402);

    return json({ plan: chosen.plan, expiresAt: row.expires_at });
  } catch (e) {
    console.log(`hata ${String(e)}`);
    return json({ error: "sunucu_hatasi" }, 500);
  }
});
