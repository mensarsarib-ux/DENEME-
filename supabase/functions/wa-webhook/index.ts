// Supabase Edge Function: wa-webhook
// Meta WhatsApp Cloud API webhook'u: işletme numarasına gelen mesajları ve gönderdiğimiz mesajların
// durumlarını (iletildi, okundu, başarısız) public.wa_messages tablosuna yazar. Doğrulama için kullanılmaz.
//   GET:  Meta'nın abonelik kontrolü (hub.verify_token = WA_VERIFY_TOKEN ise hub.challenge döner)
//   POST: bildirimler. İmza (X-Hub-Signature-256, uygulama gizli anahtarı WA_APP_SECRET ile) doğrulanmadan yazılmaz.
// Gerekli gizli değerler (Supabase > Edge Functions > Secrets): WA_VERIFY_TOKEN, WA_APP_SECRET

import { createClient } from "jsr:@supabase/supabase-js@2";

/** Yalnızca bu WhatsApp numarasının bildirimleri işlenir */
const PHONE_NUMBER_ID = "1481441048382966";

const enc = new TextEncoder();

async function validSignature(raw: ArrayBuffer, header: string | null, secret: string): Promise<boolean> {
  if (!header?.startsWith("sha256=")) return false;
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, raw));
  const expected = Array.from(mac, (b) => b.toString(16).padStart(2, "0")).join("");
  const given = header.slice(7).toLowerCase();
  if (given.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ given.charCodeAt(i);
  return diff === 0;
}

type WaMessage = {
  id?: string;
  from?: string;
  timestamp?: string;
  type?: string;
  text?: { body?: string };
  button?: { text?: string };
  interactive?: { button_reply?: { title?: string }; list_reply?: { title?: string } };
  image?: { caption?: string };
  document?: { caption?: string; filename?: string };
};
type WaStatus = { id?: string; status?: string; timestamp?: string; recipient_id?: string; errors?: unknown };
type WaValue = {
  metadata?: { phone_number_id?: string };
  contacts?: { wa_id?: string; profile?: { name?: string } }[];
  messages?: WaMessage[];
  statuses?: WaStatus[];
};
type WaPayload = { entry?: { changes?: { field?: string; value?: WaValue }[] }[] };

const when = (ts?: string) => (ts && /^\d+$/.test(ts) ? new Date(Number(ts) * 1000).toISOString() : null);

function textOf(m: WaMessage): string | null {
  return (
    m.text?.body ??
    m.button?.text ??
    m.interactive?.button_reply?.title ??
    m.interactive?.list_reply?.title ??
    m.image?.caption ??
    m.document?.caption ??
    m.document?.filename ??
    null
  );
}

Deno.serve(async (req) => {
  const url = new URL(req.url);

  if (req.method === "GET") {
    const token = Deno.env.get("WA_VERIFY_TOKEN");
    if (
      token &&
      url.searchParams.get("hub.mode") === "subscribe" &&
      url.searchParams.get("hub.verify_token") === token
    ) {
      return new Response(url.searchParams.get("hub.challenge") ?? "", { status: 200 });
    }
    return new Response("forbidden", { status: 403 });
  }

  if (req.method !== "POST") return new Response("method", { status: 405 });

  const secret = Deno.env.get("WA_APP_SECRET");
  const raw = await req.arrayBuffer();
  if (!secret || !(await validSignature(raw, req.headers.get("x-hub-signature-256"), secret))) {
    console.log("wa-webhook: imza gecersiz ya da WA_APP_SECRET yok");
    return new Response("unauthorized", { status: 401 });
  }

  let payload: WaPayload = {};
  try {
    payload = JSON.parse(new TextDecoder().decode(raw));
  } catch {
    return new Response("ok", { status: 200 });
  }

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const rows: Record<string, unknown>[] = [];

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const v = change.value;
      if (change.field !== "messages" || v?.metadata?.phone_number_id !== PHONE_NUMBER_ID) continue;
      const names = new Map((v.contacts ?? []).map((c) => [c.wa_id ?? "", c.profile?.name ?? null]));
      for (const m of v.messages ?? []) {
        rows.push({
          wa_message_id: m.id ?? null,
          direction: "in",
          wa_from: m.from ?? null,
          profile_name: names.get(m.from ?? "") ?? null,
          type: m.type ?? null,
          body: textOf(m),
          sent_at: when(m.timestamp),
          raw: m,
        });
      }
      for (const s of v.statuses ?? []) {
        rows.push({
          wa_message_id: s.id ?? null,
          direction: "status",
          wa_from: s.recipient_id ?? null,
          status: s.status ?? null,
          sent_at: when(s.timestamp),
          raw: s,
        });
      }
    }
  }

  for (const row of rows) {
    const { error } = await admin.from("wa_messages").insert(row);
    // 23505: Meta aynı mesajı tekrar iletti, zaten kayıtlı
    if (error && error.code !== "23505") console.log(`wa-webhook: kayit hatasi ${error.message}`);
  }

  // Meta tekrar denemesin diye her zaman 200
  return new Response("ok", { status: 200 });
});
