import { Capacitor } from "@capacitor/core";
import { NativeBiometric } from "@capgo/capacitor-native-biometric";
import { t } from "./i18n";

/** Uygulama kilidi (Face ID / Touch ID). Bu telefona özeldir, hesapla eşitlenmez. */
const LOCK_KEY = "hesabim:app-lock";

export function isLockEnabled(): boolean {
  // Kilit yalnızca iPhone uygulamasında çalışır; tarayıcıda hiçbir zaman kilitlenmez
  if (!Capacitor.isNativePlatform()) return false;
  try {
    return localStorage.getItem(LOCK_KEY) === "1";
  } catch {
    return false;
  }
}

export function setLockEnabled(on: boolean) {
  try {
    if (on) localStorage.setItem(LOCK_KEY, "1");
    else localStorage.removeItem(LOCK_KEY);
  } catch {
    /* saklanamazsa kilit bu oturumda geçerli olmaz */
  }
}

/** Telefonda Face ID / Touch ID ya da en azından cihaz şifresi var mı; yoksa kilit önerilmez */
export async function lockAvailable(): Promise<{ available: boolean; faceId: boolean }> {
  if (!Capacitor.isNativePlatform()) return { available: false, faceId: false };
  try {
    const r = await NativeBiometric.isAvailable({ useFallback: true });
    return { available: r.isAvailable, faceId: Number(r.biometryType) === 2 };
  } catch {
    return { available: false, faceId: false };
  }
}

/** Kimlik doğrulaması ister; Face ID olmazsa cihaz şifresiyle de açılabilir (kullanıcı dışarıda kalmaz) */
export async function verifyOwner(): Promise<boolean> {
  try {
    await NativeBiometric.verifyIdentity({
      reason: t("Hesabım'ı açmak için kimliğinizi doğrulayın"),
      useFallback: true,
    });
    return true;
  } catch {
    return false;
  }
}
