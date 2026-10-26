import { useEffect, useState, type Dispatch, type SetStateAction } from "react";

/** Saklanan verilerin sürümü; veri yapısı değişirse artırılır ve eski kayıtlar yok sayılır */
const BASE = "hesabim:v1:";
const WORKSPACE_KEY = "hesabim:workspace";
const WORKSPACES_KEY = "hesabim:workspaces";

/** Ana işletme (ilk kurulumdaki veriler) */
export const MAIN_WORKSPACE = "main";

export interface Workspace {
  id: string;
  name: string;
}

/** Aktif işletme; değişince uygulama yeniden yüklenir ve o işletmenin verisi açılır */
export function activeWorkspace(): string {
  try {
    return localStorage.getItem(WORKSPACE_KEY) || MAIN_WORKSPACE;
  } catch {
    return MAIN_WORKSPACE;
  }
}

function prefix(): string {
  const ws = activeWorkspace();
  return ws === MAIN_WORKSPACE ? BASE : `${BASE}ws:${ws}:`;
}

/** Kayıtlı işletmeler (ana işletme dahil değil) */
export function listWorkspaces(): Workspace[] {
  try {
    const raw = localStorage.getItem(WORKSPACES_KEY);
    return raw ? (JSON.parse(raw) as Workspace[]) : [];
  } catch {
    return [];
  }
}

/** Yeni işletme oluşturur, verilen profille başlatır ve ona geçer (sayfa yeniden yüklenmeli) */
export function createWorkspace(name: string, profile: object, serverId?: string): string {
  // Sunucuda oluşturulmuşsa aynı kimlik kullanılır; böylece ekip üyeleriyle eşleşir
  const id = serverId ?? Math.random().toString(36).slice(2, 10);
  try {
    localStorage.setItem(WORKSPACES_KEY, JSON.stringify([...listWorkspaces(), { id, name }]));
    // Yeni işletme bomboş açılır: örnek kayıtlar yerine boş listeler yazılır
    const empty: Record<string, unknown> = {
      profile,
      parties: [],
      transactions: [],
      notes: [],
      readIds: [],
      // Kasa hesapları sıfır açılış bakiyesiyle başlar
      accounts: [
        { id: "cash", name: "Nakit", opening: 0 },
        { id: "bank", name: "Banka", opening: 0 },
      ],
    };
    for (const [key, value] of Object.entries(empty)) {
      localStorage.setItem(`${BASE}ws:${id}:${key}`, JSON.stringify(value));
    }
    localStorage.setItem(WORKSPACE_KEY, id);
  } catch {
    /* depolama kapalıysa işletme oluşturulamaz */
  }
  return id;
}

/** Bir işletmeye geçer; sayfa yeniden yüklenerek o işletmenin verisi açılır */
export function switchWorkspace(id: string) {
  try {
    if (id === MAIN_WORKSPACE) localStorage.removeItem(WORKSPACE_KEY);
    else localStorage.setItem(WORKSPACE_KEY, id);
  } catch {
    /* sessizce geç */
  }
  window.location.reload();
}

/** Tarayıcıda saklanan kayıtların anahtarları (yedek alma ve sıfırlama için) */
export const STORAGE_KEYS = [
  "groups",
  "parties",
  "transactions",
  "accounts",
  "profile",
  "notes",
  "readIds",
  "settings",
] as const;

function read<T>(key: string): T | undefined {
  try {
    const raw = localStorage.getItem(prefix() + key);
    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch {
    return undefined;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(prefix() + key, JSON.stringify(value));
  } catch {
    /* depolama kapalıysa uygulama bellekte çalışmaya devam eder */
  }
}

/** Tüm saklanan kayıtları siler (ayarlardaki sıfırlama) */
export function clearStored() {
  try {
    for (const key of STORAGE_KEYS) localStorage.removeItem(prefix() + key);
  } catch {
    /* sessizce geç */
  }
}

/**
 * useState gibi çalışır ama değeri tarayıcıda saklar; sayfa yenilense de veriler kalır.
 * Depolama kullanılamıyorsa (gizli sekme, engelli site verisi) normal bellek durumu gibi davranır.
 */
export function usePersistedState<T>(
  key: string,
  initial: T,
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => read<T>(key) ?? initial);
  useEffect(() => {
    write(key, value);
  }, [key, value]);
  return [value, setValue];
}

/** Ana işletmenin adı (ana işletme aktif değilken de okunabilsin diye doğrudan kayıttan alınır) */
function mainName(): string {
  try {
    const raw = localStorage.getItem(BASE + "profile");
    const profile = raw ? (JSON.parse(raw) as { name?: string }) : null;
    return profile?.name?.trim() || "Hesabım";
  } catch {
    return "Hesabım";
  }
}

/** Tüm işletmeler: önce ana işletme, sonra eklenenler */
/** Ana işletme, yerel işletmeler ve sunucudaki ortak işletmeler (yerelde olmayanlar) */
export function businessList(shared: Workspace[] = []): Workspace[] {
  const local = listWorkspaces();
  const known = new Set(local.map((w) => w.id));
  return [
    { id: MAIN_WORKSPACE, name: mainName() },
    ...local,
    ...shared.filter((w) => !known.has(w.id) && w.id !== MAIN_WORKSPACE),
  ];
}

/** Bir işletmeyi ve tüm verilerini siler. Ana işletme silinemez. Çağıran, kimlik doğrulamasını önceden yapmalı. */
export function deleteWorkspace(id: string) {
  if (id === MAIN_WORKSPACE) return;
  try {
    const head = `${BASE}ws:${id}:`;
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith(head)) localStorage.removeItem(key);
    }
    localStorage.setItem(WORKSPACES_KEY, JSON.stringify(listWorkspaces().filter((w) => w.id !== id)));
    if (activeWorkspace() === id) localStorage.removeItem(WORKSPACE_KEY);
  } catch {
    /* sessizce geç */
  }
}
