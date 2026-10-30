// Supabase Edge Function: phone-login
// Telefon numarası ve şifreyle giriş. Numara hesabın e-postasına çevrilir ve Supabase'in şifre girişi yapılır.
// Yanıtta e-posta ya da hangi bilginin yanlış olduğu döndürülmez: her hata aynı mesajla döner.

import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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
  const { data: email } = await admin.rpc("email_for_phone", { p: phone });
  if (!email) return json({ error: "invalid_credentials" }, 401);

  // Asıl şifre kontrolü Supabase'in kendi girişiyle yapılır
  const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: Deno.env.get("SUPABASE_ANON_KEY")!, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) return json({ error: "invalid_credentials" }, 401);
  return json(await res.json());
});
