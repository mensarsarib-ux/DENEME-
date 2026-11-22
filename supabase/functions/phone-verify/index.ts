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
  const phone = await verifiedPhone(String(input.idToken ?? ""));
  if (!phone) return json({ error: "invalid_token" }, 401);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

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
    // (Üye ol, Ekibe katıl) numarayla yeni hesap açılır. E-posta istenmez; hesabın iç e-postası numaradan üretilir.
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
        email: `${phone.replace(/\D/g, "")}@${PHONE_EMAIL_DOMAIN}`,
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
