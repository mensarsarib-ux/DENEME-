import { Capacitor } from "@capacitor/core";

/** Android uygulamasında mı çalışıyor? (Abonelik ve iptal yolları Google Play'e göre anlatılır) */
export const onAndroid = (): boolean => Capacitor.getPlatform() === "android";

/**
 * Yasal sayfaların kökü. Android'de Google Play'e göre yazılmış sayfalar (/android/) açılır;
 * iPhone'daki sayfalar yalnızca App Store'u anlatır.
 */
export const legalBase = (): string =>
  onAndroid() ? "https://hesabimmuhasebe.com/android" : "https://hesabimmuhasebe.com";
