// Supabase Edge Function: apple-notifications
// App Store Server Notifications (V2): yenileme, iptal, iade gibi abonelik değişikliklerinde Apple bu adrese haber verir.
// Bildirimin içeriğine güvenilmez; yalnızca hangi aboneliğin değiştiği okunur ve abonelik Apple'a kendi anahtarımızla
// tekrar sorulur. Sonuç, aboneliği şu an kullanan hesabın kaydına yazılır (iade ya da bitişte paket kapanır).
// Bu fonksiyonda "Verify JWT" kapalı olmalıdır (Apple oturum bilgisi göndermez).

import { createClient } from "jsr:@supabase/supabase-js@2";

const PRODUCT_PLAN: Record<string, string> = {
  "com.mensar.hesabim.pro.yearly": "pro",
  "com.mensar.hesabim.proplus.yearly": "proplus",
  "com.mensar.hesabim.premium.yearly": "premium",
};
const RANK: Record<string, number> = { pro: 1, proplus: 2, premium: 3 };
const BUNDLE_ID = "com.mensar.hesabim";
const HOSTS = ["api.storekit.itunes.apple.com", "api.storekit-sandbox.itunes.apple.com"];

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

const ok = () => new Response("ok", { status: 200 });

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("method", { status: 405 });
  const input = (await req.json().catch(() => null)) as { signedPayload?: string } | null;
  let original = "";
  let type = "";
  try {
    const payload = readJws(String(input?.signedPayload ?? "")) as {
      notificationType?: string;
      subtype?: string;
      data?: { bundleId?: string; signedTransactionInfo?: string };
    };
    type = `${payload.notificationType ?? ""}${payload.subtype ? `/${payload.subtype}` : ""}`;
    if (payload.data?.bundleId && payload.data.bundleId !== BUNDLE_ID) return ok();
    if (payload.data?.signedTransactionInfo) {
      original = String((readJws(payload.data.signedTransactionInfo) as TxInfo).originalTransactionId ?? "");
    }
  } catch {
    return new Response("bad", { status: 400 });
  }
  console.log(`bildirim ${type} abonelik=${original || "-"}`);
  // Deneme bildirimi (TEST) ya da işlemsiz bildirim: yapılacak bir şey yok
  if (!/^\d+$/.test(original)) return ok();

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  // Aboneliği şu an kullanan hesap (başka hesaba taşınanlar ücretsizdir)
  const { data: rows, error: readError } = await admin
    .from("entitlements")
    .select("user_id")
    .eq("original_transaction_id", original)
    .neq("plan", "free");
  if (readError) {
    console.log(`okuma hatasi ${readError.message}`);
    return new Response("error", { status: 500 });
  }
  if (!rows || rows.length === 0) {
    // Henüz uygulamada doğrulanmamış satın alma: uygulama doğrulayınca kaydedilir
    console.log(`kayitli hesap yok ${original}`);
    return ok();
  }

  try {
    const token = await appleJwt();
    const status = await appleGet(`/inApps/v1/subscriptions/${original}`, token);
    if (!status.data) return new Response("apple", { status: 500 });
    const now = Date.now();
    let best: { plan: string; productId: string; expires: number } | null = null;
    const groups = (status.data.data ?? []) as { lastTransactions?: { status?: number; signedTransactionInfo: string }[] }[];
    for (const group of groups) {
      for (const last of group.lastTransactions ?? []) {
        const info = readJws(last.signedTransactionInfo) as TxInfo;
        const plan = PRODUCT_PLAN[info.productId];
        // 1: aktif, 4: ödeme ek süresi; iade edilen (revocationDate) ve yükseltilen işlem sayılmaz
        const active = last.status === 1 || last.status === 4;
        const same = String(info.originalTransactionId ?? "") === original;
        if (!plan || info.bundleId !== BUNDLE_ID || !active || !same || info.revocationDate || info.isUpgraded) continue;
        if (!best || RANK[plan] > RANK[best.plan]) {
          best = { plan, productId: info.productId, expires: Math.max(info.expiresDate ?? 0, now + 24 * 3600 * 1000) };
        }
      }
    }
    const chosen = best as { plan: string; productId: string; expires: number } | null;
    const stamp = new Date().toISOString();
    const update = chosen
      ? { plan: chosen.plan, product_id: chosen.productId, expires_at: new Date(chosen.expires).toISOString(), updated_at: stamp }
      : { plan: "free", expires_at: stamp, updated_at: stamp };
    const { error } = await admin
      .from("entitlements")
      .update(update)
      .eq("original_transaction_id", original)
      .neq("plan", "free");
    if (error) {
      console.log(`kayit hatasi ${error.message}`);
      return new Response("error", { status: 500 });
    }
    console.log(`guncellendi ${original} -> ${update.plan}`);
    return ok();
  } catch (e) {
    console.log(`hata ${String(e)}`);
    return new Response("error", { status: 500 });
  }
});
