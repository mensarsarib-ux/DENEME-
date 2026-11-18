// Supabase Edge Function: email-check
// Kayıtta yazılan e-postanın alan adı gerçekten mail alabiliyor mu (MX kaydı; yoksa A kaydı) diye bakar.
// Mail gönderilmez ve adres saklanmaz; yalnızca alan adı DNS'te sorgulanır (Cloudflare, olmazsa Google DNS).
// DNS'e ulaşılamazsa "unknown" döner; uygulama bu durumda kullanıcıyı engellemez.

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

const RESOLVERS = ["https://cloudflare-dns.com/dns-query", "https://dns.google/resolve"];

/** Kaydın varlığına bakar: true (var), false (yok), null (sorulamadı) */
async function hasRecord(domain: string, type: "MX" | "A"): Promise<boolean | null> {
  for (const base of RESOLVERS) {
    try {
      const res = await fetch(`${base}?name=${encodeURIComponent(domain)}&type=${type}`, {
        headers: { accept: "application/dns-json" },
        signal: AbortSignal.timeout(3000),
      });
      if (!res.ok) continue;
      const body = (await res.json()) as { Status?: number; Answer?: { type: number }[] };
      // 3: alan adı yok (NXDOMAIN)
      if (body.Status === 3) return false;
      if (body.Status !== 0) continue;
      const want = type === "MX" ? 15 : 1;
      return (body.Answer ?? []).some((a) => a.type === want);
    } catch {
      // sıradaki çözümleyici denenir
    }
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  const input = (await req.json().catch(() => ({}))) as { domain?: string };
  const domain = String(input.domain ?? "").trim().toLowerCase();
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(domain) || domain.length > 253) return json({ result: "invalid" });

  const mx = await hasRecord(domain, "MX");
  if (mx === true) return json({ result: "ok" });
  const a = await hasRecord(domain, "A");
  if (a === true) return json({ result: "ok" });
  if (mx === false || a === false) return json({ result: "no_mail" });
  return json({ result: "unknown" });
});
