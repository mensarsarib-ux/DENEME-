import { Capacitor } from "@capacitor/core";

/** Android uygulamasında mı çalışıyor? (Abonelik ve iptal yolları Google Play'e göre anlatılır) */
export const onAndroid = (): boolean => Capacitor.getPlatform() === "android";
