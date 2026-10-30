// Supabase Edge Function: phone-login
// Telefon numarası ve şifreyle giriş. Numara hesabın e-postasına çevrilir ve Supabase'in şifre girişi yapılır.
// Yanıtta e-posta ya da hangi bilginin yanlış olduğu döndürülmez: her hata aynı mesajla döner.
// Hatalı denemeler sayılır: 15 dakikada bir numaraya 5, bir adresten 20 hatalı denemeden sonra giriş bekletilir.

import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_PHONE = 5;
const MAX_PER_IP = 20;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  const input = (await req.json().catch(() => ({}))) as { phone?: string; password?: string };
  const phone = String(input.phone ?? "").replace(/[^\d+]/g, "");
  const password = String(input.password ?? "");
  if (!/^\+\d{10,15}$/.test(phone) || password.length < 6) return json({ error: "invalid_credentials" }, 401);

  const url = Deno.env.get("SUPABASE_URL")!;
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || null;

  // Çok hatalı deneme varsa şifre hiç denenmez
  const since = new Date(Date.now() - WINDOW_MS).toISOString();
  const byPhone = await admin
    .from("phone_login_attempts")
    .select("id", { count: "exact", head: true })
    .eq("phone", phone)
    .gte("at", since);
  const byIp = ip
    ? await admin.from("phone_login_attempts").select("id", { count: "exact", head: true }).eq("ip", ip).gte("at", since)
    : { count: 0 };
  if ((byPhone.count ?? 0) >= MAX_PER_PHONE || (byIp.count ?? 0) >= MAX_PER_IP) {
    return json({ error: "too_many_attempts" }, 429);
  }

  const failed = async () => {
    await admin.from("phone_login_attempts").insert({ phone, ip });
    // Eski kayıtlar ara sıra temizlenir
    if (Math.random() < 0.05) {
      await admin.from("phone_login_attempts").delete().lt("at", new Date(Date.now() - 24 * 3600 * 1000).toISOString());
    }
    return json({ error: "invalid_credentials" }, 401);
  };

  const { data: email } = await admin.rpc("email_for_phone", { p: phone });
  if (!email) return await failed();

  // Asıl şifre kontrolü Supabase'in kendi girişiyle yapılır
  const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: Deno.env.get("SUPABASE_ANON_KEY")!, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) return await failed();
  // Başarılı girişte bu numaranın hatalı denemeleri silinir
  await admin.from("phone_login_attempts").delete().eq("phone", phone);
  return json(await res.json());
});
