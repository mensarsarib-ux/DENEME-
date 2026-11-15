import { Capacitor } from "@capacitor/core";

/**
 * App Store puan penceresi (yalnızca iPhone). Apple'ın kendi penceresi açılır; gösterip göstermemeye Apple karar verir
 * (yılda en fazla 3 kez). Tetik: bu cihazda girilen 5. kayıt ya da ilk ekstre paylaşımı. Bir kez sorulduktan sonra
 * 30 gün tekrar sorulmaz. Ödül, indirim ya da yönlendirici metin yok.
 */
const KEY_RECORDS = "hesabim:puan-kayit-sayisi";
const KEY_SHARED = "hesabim:puan-ekstre-paylasildi";
const KEY_LAST = "hesabim:puan-son-istek";
const WAIT_DAYS = 30;

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* depolama kapalıysa sessizce geç */
  }
}

async function ask(): Promise<void> {
  if (Capacitor.getPlatform() !== "ios") return;
  const last = Number(read(KEY_LAST) || 0);
  if (last && Date.now() - last < WAIT_DAYS * 86_400_000) return;
  write(KEY_LAST, String(Date.now()));
  try {
    const { InAppReview } = await import("@capacitor-community/in-app-review");
    await InAppReview.requestReview();
  } catch {
    /* puan penceresi açılamazsa uygulama etkilenmesin */
  }
}

/** Yeni bir kayıt kaydedildiğinde çağrılır (düzenleme sayılmaz) */
export function noteRecordAdded(): void {
  if (Capacitor.getPlatform() !== "ios") return;
  const count = Number(read(KEY_RECORDS) || 0) + 1;
  write(KEY_RECORDS, String(count));
  if (count === 5) window.setTimeout(() => void ask(), 1200);
}

/** Ekstre paylaşım penceresi başarıyla kapandığında çağrılır */
export function noteStatementShared(): void {
  if (Capacitor.getPlatform() !== "ios") return;
  if (read(KEY_SHARED)) return;
  write(KEY_SHARED, "1");
  window.setTimeout(() => void ask(), 1200);
}
