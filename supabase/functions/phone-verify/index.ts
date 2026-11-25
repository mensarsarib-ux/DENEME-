// Supabase Edge Function: phone-verify
// Telefon numarasının SMS koduyla doğrulanması. SMS'i Firebase gönderir ve doğrular; uygulama, kod doğru girilince
// Firebase'in verdiği kimlik belirtecini (ID token) buraya yollar. Numara yalnızca bu imzalı belirteçten okunur.
//   action "check":  numara başka bir hesapta doğrulanmış mı? (oturum gerekmez; SMS kanıtı yeterli)
//   action "attach": numarayı giriş yapmış kullanıcının hesabına doğrulanmış olarak yazar (Authorization: Bearer <oturum>)
//   action "session": SMS koduyla giriş; hesap yoksa create ile numarayla yeni hesap açılır (e-posta ve şifre istenmez)
//   action "reset":  şifremi unuttum; numarayı SMS ile doğrulamış hesabın şifresini yeniler (yalnızca doğrulanmış numara)

import { createClient } from "jsr:@supabase/supabase-js@2";
import { createRemoteJWKSet, jwtVerify } from "npm:jose@5.9.6";

const FIREBASE_PROJECT = "hesabim-46214";
const JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"),
);
/** Belirteç SMS doğrulamasından en fazla bu kadar sonra kullanılabilir */
const MAX_AGE_SEC = 60 * 60;
/** Telefonla açılan hesabın iç e-postası (kullanıcıya gösterilmez, bu alana e-posta gönderilmez) */
const PHONE_EMAIL_DOMAIN = "tel.hesabimmuhasebe.com";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

/** Firebase belirtecini doğrular ve içindeki telefon numarasını (+905…) döndürür */
async function verifiedPhone(idToken: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(idToken, JWKS, {
      issuer: `https://securetoken.google.com/${FIREBASE_PROJECT}`,
      audience: FIREBASE_PROJECT,
    });
    const authTime = Number(payload.auth_time ?? 0);
    if (!authTime || Date.now() / 1000 - authTime > MAX_AGE_SEC) return null;
    const provider = (payload.firebase as { sign_in_provider?: string } | undefined)?.sign_in_provider;
    const phone = String(payload.phone_number ?? "");
    if (provider !== "phone" || !/^\+\d{8,15}$/.test(phone)) return null;
    return phone;
  } catch {
    return null;
  }
}

/** Numara başına WhatsApp kodu: 10 dakikalık pencerede sabit (HMAC), tabloda tutulmaz */
const WA_NUMBER_ID = "1481441048382966";
const WA_WINDOW_MS = 10 * 60 * 1000;

async function waCodeFor(phone: string, win: number): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode((Deno.env.get("WA_APP_SECRET") ?? "").trim()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(`wa-otp|${phone}|${win}`)));
  const n = ((mac[0] << 24) | (mac[1] << 16) | (mac[2] << 8) | mac[3]) >>> 0;
  return String(n % 1000000).padStart(6, "0");
}

/** "wa:+90…:123456" belirtecini doğrular: kod bu pencerede (ya da bir önceki pencerede) üretilmiş olmalı */
async function waVerifiedPhone(token: string): Promise<string | null> {
  const m = /^wa:(\+\d{8,15}):(\d{6})$/.exec(token);
  if (!m) return null;
  const [, phone, code] = m;
  const now = Math.floor(Date.now() / WA_WINDOW_MS);
  for (const win of [now, now - 1]) {
    if ((await waCodeFor(phone, win)) === code) return phone;
  }
  return null;
}

/** Kodu WhatsApp'tan gönderir. Sınır: aynı numaraya 5 dakikada 1, saatte en fazla 3 kod */
async function waSend(admin: ReturnType<typeof createClient>, raw: string, req: Request): Promise<Response> {
  const phone = raw.replace(/[^\d+]/g, "");
  if (!/^\+\d{8,15}$/.test(phone)) return json({ error: "invalid_phone" }, 400);
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { data: rows, error } = await admin
    .from("phone_login_attempts")
    .select("at")
    .eq("phone", phone)
    .gte("at", hourAgo)
    .order("at", { ascending: false });
  if (error) return json({ error: "server" }, 500);
  const list = rows ?? [];
  if (list.length >= 3) return json({ error: "hourly" }, 429);
  if (list.length) {
    const wait = 5 * 60 * 1000 - (Date.now() - new Date(list[0].at as string).getTime());
    if (wait > 0) return json({ error: "wait", seconds: Math.ceil(wait / 1000) }, 429);
  }
  await admin.from("phone_login_attempts").insert({
    phone,
    ip: req.headers.get("x-forwarded-for") ?? "",
    at: new Date().toISOString(),
  });
  const code = await waCodeFor(phone, Math.floor(Date.now() / WA_WINDOW_MS));
  const r = await fetch(`https://graph.facebook.com/v21.0/${WA_NUMBER_ID}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${(Deno.env.get("WA_ACCESS_TOKEN") ?? "").trim()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: phone.slice(1),
      type: "template",
      template: {
        name: "hesabim_giris_kodu",
        language: { code: "tr" },
        components: [
          { type: "body", parameters: [{ type: "text", text: code }] },
          { type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: code }] },
        ],
      },
    }),
  });
  if (!r.ok) {
    console.log(`wa-send hata ${r.status}`);
    return json({ error: "wa_failed" }, 502);
  }
  return json({ ok: true });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  const input = (await req.json().catch(() => ({}))) as {
    idToken?: string;
    action?: string;
    password?: string;
    create?: boolean;
    lang?: string;
  };
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // WhatsApp ile kod gönderme: onaylı "hesabim_giris_kodu" şablonuyla 6 haneli kod gider (kimlik belirteci gerekmez)
  if (input.action === "wa-send") return waSend(admin, String(input.phone ?? ""), req);

  // Kimlik kanıtı: WhatsApp kodu ("wa:+90…:123456") ya da Firebase SMS belirteci (eski sürümler için)
  const idToken = String(input.idToken ?? "");
  const phone = idToken.startsWith("wa:") ? await waVerifiedPhone(idToken) : await verifiedPhone(idToken);
  if (!phone) return json({ error: "invalid_token" }, 401);

  if (input.action === "check") {
    const { data, error } = await admin.rpc("phone_owner", { p: phone });
    if (error) return json({ error: "server" }, 500);
    return json({ phone, taken: !!data });
  }

  if (input.action === "attach") {
    const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
    const { data: who } = await admin.auth.getUser(token);
    if (!who?.user) return json({ error: "expired" }, 401);
    const { data, error } = await admin.rpc("attach_verified_phone", { uid: who.user.id, p: phone });
    if (error) return json({ error: "server" }, 500);
    if (data === "taken") return json({ error: "phone_taken" }, 409);
    return json({ phone, verified: true });
  }

  if (input.action === "reset") {
    const password = String(input.password ?? "");
    if (password.length < 6) return json({ error: "weak_password" }, 400);
    // Yalnızca bu numarayı SMS ile doğrulamış (ve hâlâ kullanan) hesap: doğrulanmamış numarayla hesap ele geçirilemez
    const { data: uid, error } = await admin.rpc("phone_owner", { p: phone });
    if (error) return json({ error: "server" }, 500);
    if (!uid) return json({ error: "no_account" }, 404);
    const { error: updateError } = await admin.auth.admin.updateUserById(uid as string, { password });
    if (updateError) return json({ error: "server" }, 500);
    return json({ ok: true });
  }

  if (input.action === "session") {
    // SMS koduyla giriş ya da kayıt: numarayı doğrulamış hesaba oturum açılır. Hesap yoksa ve create istendiyse
    // (işletme adı girildi ya da davete katılındı) numarayla yeni hesap açılır. E-posta istenmez; iç e-posta rastgeledir.
    let { data: uid, error } = await admin.rpc("phone_owner", { p: phone });
    if (error) return json({ error: "server" }, 500);
    let isNew = false;
    if (!uid) {
      if (!input.create) {
        // Kayıtlı değil: bu numaraya gelmiş ekip davetleri de döner (uygulama "Katıl" ya da işletme adı sorar)
        const { data: invites } = await admin
          .from("team_invites")
          .select("id, businesses(name)")
          .eq("phone", phone)
          .order("created_at", { ascending: false });
        const list = (invites ?? []).map((i) => ({
          id: i.id as string,
          businessName: ((i as { businesses?: { name?: string } | null }).businesses?.name ?? "") as string,
        }));
        return json({ error: "no_account", invites: list }, 404);
      }
      const lang = typeof input.lang === "string" ? input.lang.slice(0, 5) : "tr";
      const created = await admin.auth.admin.createUser({
        // Tahmin edilemeyen iç adres: numaradan türetilseydi biri bu adresle önceden kayıt olup numarayı kilitleyebilirdi
        email: `${crypto.randomUUID()}@${PHONE_EMAIL_DOMAIN}`,
        email_confirm: true,
        password: crypto.randomUUID() + crypto.randomUUID(),
        // Numara burada yazılmaz: attach_verified_phone yazar (başka hesapta doğrulanmamış aynı numara varsa önce oradan kaldırır)
        user_metadata: { lang, phone_verified: true, email_verified: false },
      });
      if (created.error || !created.data.user) {
        console.log(`hesap acilamadi ${created.error?.message ?? ""}`);
        return json({ error: "server" }, 500);
      }
      uid = created.data.user.id;
      const attached = await admin.rpc("attach_verified_phone", { uid, p: phone });
      if (attached.error || attached.data === "taken") return json({ error: "server" }, 500);
      isNew = true;
    }
    const { data: user } = await admin.auth.admin.getUserById(uid as string);
    const email = user?.user?.email;
    if (!email) return json({ error: "server" }, 500);
    // Tek kullanımlık giriş anahtarı: uygulama bunu /auth/v1/verify ile oturuma çevirir (e-posta gönderilmez)
    const link = await admin.auth.admin.generateLink({ type: "magiclink", email });
    const tokenHash = link.data?.properties?.hashed_token;
    if (link.error || !tokenHash) return json({ error: "server" }, 500);
    return json({ tokenHash, isNew });
  }

  return json({ error: "action" }, 400);
});
