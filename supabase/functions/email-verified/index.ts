// Supabase Edge Function: email-verified
// Menüden e-posta doğrulaması: kullanıcı e-postasına gelen kodu girince (e-posta OTP) yeni bir oturum açılır.
// Bu fonksiyon o oturumun gerçekten az önce e-posta koduyla açıldığını (amr: otp/magiclink) kontrol eder ve
// hesaptaki "email_unverified" işaretini kaldırır. Kod girilmeden işaret kaldırılamaz.

import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const MAX_AGE_SEC = 10 * 60;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

function payloadOf(jwt: string): Record<string, unknown> | null {
  try {
    const part = jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(part.padEnd(part.length + ((4 - (part.length % 4)) % 4), "=")));
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // İmza ve süre Supabase tarafından doğrulanır; içerik ancak bundan sonra okunur
  const { data: who } = await admin.auth.getUser(token);
  if (!who?.user) return json({ error: "expired" }, 401);
  const claims = payloadOf(token);
  const amr = (claims?.amr ?? []) as { method?: string; timestamp?: number }[];
  const now = Date.now() / 1000;
  const viaCode = amr.some((a) => (a.method === "otp" || a.method === "magiclink") && now - Number(a.timestamp ?? 0) < MAX_AGE_SEC);
  if (!viaCode) return json({ error: "not_verified" }, 403);

  const meta = { ...(who.user.app_metadata ?? {}) } as Record<string, unknown>;
  delete meta.email_unverified;
  const { error } = await admin.auth.admin.updateUserById(who.user.id, { app_metadata: { ...meta, email_unverified: false } });
  if (error) return json({ error: "server" }, 500);
  return json({ ok: true });
});
