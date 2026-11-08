import { Capacitor } from "@capacitor/core";

/**
 * Bu cihazda çalışan uygulamanın sürümü, ör. "1.0 (47)". Parantez içindeki sayı mağazaya yüklenen
 * derleme numarasıdır (Android versionCode, iOS build). Tarayıcıda Android sürümü gösterilir.
 */
export function appVersion(): string {
  return Capacitor.getPlatform() === "ios" ? __IOS_VERSION__ : __ANDROID_VERSION__;
}
