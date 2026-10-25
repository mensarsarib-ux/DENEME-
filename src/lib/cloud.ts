/**
 * Hesap ve bulut eşitleme (Supabase): e-posta + şifre ile kayıt/giriş, verinin sunucuda saklanması.
 * Ek bir kütüphane kullanılmaz; Supabase'in kimlik (GoTrue) ve tablo (PostgREST) uçlarına doğrudan istek atılır.
 * VITE_SUPABASE_URL ve VITE_SUPABASE_ANON_KEY tanımlı değilse uygulama yalnızca bu cihazda çalışır.
 */

import { Capacitor } from "@capacitor/core";
import { t } from "./i18n";

const URL_BASE = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/+$/, "") ?? "";
const ANON = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? "";

export const cloudEnabled = URL_BASE !== "" && ANON !== "";

export interface Session {
  accessToken: string;
  refreshToken: string;
  /** Erişim anahtarının bitiş zamanı (ms) */
  expiresAt: number;
  userId: string;
  email: string;
}

export class CloudError extends Error {
  constructor(
    /** invalid_credentials | email_taken | weak_password | email_not_confirmed | network | unknown */
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

const SESSION_KEY = "hesabim:auth";

export function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

function saveSession(session: Session | null) {
  try {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    /* depolama kapalıysa oturum yalnızca bellekte kalır */
  }
}

async function call(path: string, init: RequestInit & { token?: string } = {}): Promise<Response> {
  const { token, headers, ...rest } = init;
  try {
    return await fetch(`${URL_BASE}${path}`, {
      ...rest,
      headers: {
        apikey: ANON,
        Authorization: `Bearer ${token ?? ANON}`,
        "Content-Type": "application/json",
        ...headers,
      },
    });
  } catch {
    throw new CloudError("network", "network");
  }
}

interface AuthBody {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  user?: { id: string; email?: string };
  error_code?: string;
  msg?: string;
  error_description?: string;
  message?: string;
}

function toSession(body: AuthBody, fallbackEmail: string): Session | null {
  if (!body.access_token || !body.refresh_token || !body.user) return null;
  return {
    accessToken: body.access_token,
    refreshToken: body.refresh_token,
    expiresAt: Date.now() + (body.expires_in ?? 3600) * 1000,
    userId: body.user.id,
    email: body.user.email ?? fallbackEmail,
  };
}

function authError(body: AuthBody): CloudError {
  const text = `${body.error_code ?? ""} ${body.msg ?? ""} ${body.error_description ?? ""} ${body.message ?? ""}`.toLowerCase();
  if (text.includes("already") || text.includes("registered")) return new CloudError("email_taken", text);
  if (text.includes("not confirmed")) return new CloudError("email_not_confirmed", text);
  if (text.includes("password") && (text.includes("weak") || text.includes("least") || text.includes("short")))
    return new CloudError("weak_password", text);
  if (text.includes("invalid") || text.includes("credentials")) return new CloudError("invalid_credentials", text);
  return new CloudError("unknown", text);
}

/** Telefon numarasını Supabase'in beklediği biçime (+90…) çevirir; geçersizse null */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/[^\d+]/g, "");
  const plus = digits.startsWith("+") ? digits : digits.startsWith("0") ? `+90${digits.slice(1)}` : `+90${digits}`;
  return /^\+\d{10,15}$/.test(plus) ? plus : null;
}

/** Yeni hesap: e-posta, telefon ve şifre. Doğrulama e-posta ile yapılır; oturum dönmezse "pending". */
export async function signUp(email: string, phone: string, password: string): Promise<Session | "pending"> {
  const res = await call("/auth/v1/signup", {
    method: "POST",
    body: JSON.stringify({ email, password, data: { phone } }),
  });
  const body = (await res.json().catch(() => ({}))) as AuthBody;
  if (!res.ok) throw authError(body);
  const session = toSession(body, email);
  if (!session) return "pending";
  saveSession(session);
  return session;
}

/** Giriş: e-posta ve şifreyle */
export async function signIn(email: string, password: string): Promise<Session> {
  const res = await call("/auth/v1/token?grant_type=password", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  const body = (await res.json().catch(() => ({}))) as AuthBody;
  if (!res.ok) throw authError(body);
  const session = toSession(body, email);
  if (!session) throw new CloudError("unknown", "no session");
  saveSession(session);
  return session;
}

export function signOut() {
  const session = loadSession();
  saveSession(null);
  if (session) void call("/auth/v1/logout", { method: "POST", token: session.accessToken }).catch(() => undefined);
}

/** Şifre sıfırlama: e-posta bağlantısı gönderir (bağlantı uygulamaya geri döner) */
export async function sendResetEmail(email: string): Promise<void> {
  const res = await call("/auth/v1/recover", { method: "POST", body: JSON.stringify({ email }) });
  if (!res.ok) throw authError((await res.json().catch(() => ({}))) as AuthBody);
}

/** Geçerli bir oturumla şifreyi değiştirir (kurtarma bağlantısı ya da SMS doğrulaması sonrası) */
export async function setPassword(accessToken: string, password: string): Promise<void> {
  const res = await call("/auth/v1/user", {
    method: "PUT",
    token: accessToken,
    body: JSON.stringify({ password }),
  });
  if (!res.ok) throw authError((await res.json().catch(() => ({}))) as AuthBody);
}

/** E-posta bağlantısıyla dönüldüyse adresteki kurtarma belirtecini okur (#access_token=…&type=recovery) */
export function readRecoveryToken(): string | null {
  const hash = new URLSearchParams(window.location.hash.slice(1));
  if (hash.get("type") !== "recovery") return null;
  return hash.get("access_token");
}

/** Süresi dolmak üzere olan oturumu yeniler; yenilenemiyorsa oturumu kapatır (null) */
async function fresh(session: Session): Promise<Session | null> {
  if (session.expiresAt - Date.now() > 60_000) return session;
  const res = await call("/auth/v1/token?grant_type=refresh_token", {
    method: "POST",
    body: JSON.stringify({ refresh_token: session.refreshToken }),
  });
  if (!res.ok) {
    if (res.status >= 400 && res.status < 500) saveSession(null);
    return null;
  }
  const next = toSession((await res.json()) as AuthBody, session.email);
  if (next) saveSession(next);
  return next;
}

export interface RemoteData {
  data: Record<string, unknown>;
  updatedAt: string;
}

/** Sunucudaki veriyi getirir; hiç kaydedilmemişse null. Oturum bittiyse "expired". */
export async function pull(session: Session): Promise<RemoteData | null | "expired"> {
  const s = await fresh(session);
  if (!s) return "expired";
  const res = await call(`/rest/v1/user_data?select=data,updated_at&user_id=eq.${s.userId}`, { token: s.accessToken });
  if (res.status === 401) return "expired";
  if (!res.ok) throw new CloudError("unknown", String(res.status));
  const rows = (await res.json()) as { data: Record<string, unknown>; updated_at: string }[];
  return rows.length ? { data: rows[0].data, updatedAt: rows[0].updated_at } : null;
}

/** Veriyi sunucuya yazar; sunucunun verdiği güncelleme zamanını döndürür */
export async function push(session: Session, data: Record<string, unknown>): Promise<string | "expired"> {
  const s = await fresh(session);
  if (!s) return "expired";
  const res = await call("/rest/v1/user_data?on_conflict=user_id", {
    method: "POST",
    token: s.accessToken,
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({ user_id: s.userId, data, updated_at: new Date().toISOString() }),
  });
  if (res.status === 401) return "expired";
  if (!res.ok) throw new CloudError("unknown", String(res.status));
  const rows = (await res.json()) as { updated_at: string }[];
  return rows[0]?.updated_at ?? new Date().toISOString();
}

/* ---------- Bağlı cihazlar ---------- */

export interface DeviceInfo {
  deviceId: string;
  label: string;
  lastSeen: string;
}

const DEVICE_KEY = "hesabim:device";

/** Bu tarayıcıya özgü kimlik; ilk açılışta üretilir */
export function currentDeviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    return "memory";
  }
}

/** "iPhone · Safari", "Android · Chrome" gibi kısa bir cihaz adı */
export function deviceLabel(): string {
  const ua = navigator.userAgent;
  const platform = /iPhone/.test(ua)
    ? "iPhone"
    : /iPad/.test(ua)
      ? "iPad"
      : /Android/.test(ua)
        ? "Android"
        : /Macintosh/.test(ua)
          ? "Mac"
          : /Windows/.test(ua)
            ? "Windows"
            : t("Bilinmeyen cihaz");
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /Firefox|FxiOS/.test(ua)
      ? "Firefox"
      : /CriOS|Chrome/.test(ua)
        ? "Chrome"
        : /Safari/.test(ua)
          ? "Safari"
          : "";
  // Paket içi uygulama, ana ekran uygulaması ve tarayıcı birbirinden ayrılır
  const mode = Capacitor.isNativePlatform()
    ? t("Uygulama")
    : (navigator as Navigator & { standalone?: boolean }).standalone
      ? t("Ana ekran")
      : browser;
  return mode ? `${platform} · ${mode}` : platform;
}

/** Hesabın bir cihazını listeden kaldırır (kendi cihazı dışındakiler için) */
export async function removeDevice(session: Session, deviceId: string): Promise<boolean | "expired"> {
  const s = await fresh(session);
  if (!s) return "expired";
  const res = await call(
    `/rest/v1/user_devices?user_id=eq.${s.userId}&device_id=eq.${encodeURIComponent(deviceId)}`,
    { method: "DELETE", token: s.accessToken },
  );
  if (res.status === 401) return "expired";
  return res.ok;
}

/** Bu cihazın açık olduğunu sunucuya bildirir */
export async function heartbeat(session: Session): Promise<void | "expired"> {
  const s = await fresh(session);
  if (!s) return "expired";
  const res = await call("/rest/v1/user_devices?on_conflict=user_id,device_id", {
    method: "POST",
    token: s.accessToken,
    headers: { Prefer: "resolution=merge-duplicates" },
    body: JSON.stringify({
      user_id: s.userId,
      device_id: currentDeviceId(),
      label: deviceLabel(),
      last_seen: new Date().toISOString(),
    }),
  });
  if (res.status === 401) return "expired";
  if (!res.ok) throw new CloudError("unknown", String(res.status));
}

/** Hesabın tüm cihazları, en son görülen önce */
export async function listDevices(session: Session): Promise<DeviceInfo[] | "expired"> {
  const s = await fresh(session);
  if (!s) return "expired";
  const res = await call(
    `/rest/v1/user_devices?select=device_id,label,last_seen&user_id=eq.${s.userId}&order=last_seen.desc`,
    { token: s.accessToken },
  );
  if (res.status === 401) return "expired";
  if (!res.ok) throw new CloudError("unknown", String(res.status));
  const rows = (await res.json()) as { device_id: string; label: string; last_seen: string }[];
  return rows.map((r) => ({ deviceId: r.device_id, label: r.label, lastSeen: r.last_seen }));
}

export interface FoundBusiness {
  id: string;
  name: string;
}

/** Yetkilinin e-postasıyla işletmeyi bulur (şifre gerekmez) */
export async function findBusinessByOwnerEmail(session: Session, email: string): Promise<FoundBusiness[] | "expired"> {
  const s = await fresh(session);
  if (!s) return "expired";
  const res = await call("/rest/v1/rpc/find_business_by_owner_email", {
    method: "POST",
    token: s.accessToken,
    body: JSON.stringify({ owner_email: email.trim() }),
  });
  if (res.status === 401) return "expired";
  if (!res.ok) throw new CloudError("unknown", String(res.status));
  return (await res.json()) as FoundBusiness[];
}

/** Bu işletmeye katılma isteği gönderir; yetkili onaylayana kadar bekler */
export async function requestJoin(session: Session, businessId: string): Promise<true | "expired"> {
  const s = await fresh(session);
  if (!s) return "expired";
  const res = await call("/rest/v1/join_requests", {
    method: "POST",
    token: s.accessToken,
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ business_id: businessId, requester_id: s.userId }),
  });
  if (res.status === 401) return "expired";
  if (!res.ok) throw new CloudError("unknown", String(res.status));
  return true;
}

/** Giriş gerekmeden, yetkilinin e-postasıyla işletmeyi bulur (kayıt öncesi kontrol) */
export async function findBusinessAnon(email: string): Promise<FoundBusiness[] | null> {
  const res = await call("/rest/v1/rpc/find_business_by_owner_email", {
    method: "POST",
    body: JSON.stringify({ owner_email: email.trim() }),
  });
  if (!res.ok) return null;
  return (await res.json()) as FoundBusiness[];
}
