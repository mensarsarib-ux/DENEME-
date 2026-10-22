import { useEffect, useState, type Dispatch, type SetStateAction } from "react";

/** Saklanan verilerin sürümü; veri yapısı değişirse artırılır ve eski kayıtlar yok sayılır */
const PREFIX = "hesabim:v1:";

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
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch {
    return undefined;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* depolama kapalıysa uygulama bellekte çalışmaya devam eder */
  }
}

/** Tüm saklanan kayıtları siler (ayarlardaki sıfırlama) */
export function clearStored() {
  try {
    for (const key of STORAGE_KEYS) localStorage.removeItem(PREFIX + key);
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
