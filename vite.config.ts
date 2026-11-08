import { readFileSync } from "node:fs";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/** Dosyadan sürüm bilgisini okur; bulunamazsa "?" döner (derlemeyi durdurmaz) */
function read(file: string, pattern: RegExp): string {
  try {
    return readFileSync(file, "utf8").match(pattern)?.[1] ?? "?";
  } catch {
    return "?";
  }
}

// Menüde gösterilen uygulama sürümü derleme anında yerel projelerden okunur:
// Android: android/app/build.gradle (versionName, versionCode); iOS: Xcode projesi (MARKETING_VERSION, CURRENT_PROJECT_VERSION).
// versionCode / build numarası yükseltilip web katmanı yeniden derlendiğinde menüdeki sayı kendiliğinden değişir.
const gradle = "android/app/build.gradle";
const pbxproj = "ios/App/App.xcodeproj/project.pbxproj";
const androidVersion = `${read(gradle, /versionName\s+"([^"]+)"/)} (${read(gradle, /versionCode\s+(\d+)/)})`;
const iosVersion = `${read(pbxproj, /MARKETING_VERSION = ([^;]+);/)} (${read(pbxproj, /CURRENT_PROJECT_VERSION = ([^;]+);/)})`;

export default defineConfig({
  plugins: [react()],
  define: {
    __ANDROID_VERSION__: JSON.stringify(androidVersion),
    __IOS_VERSION__: JSON.stringify(iosVersion),
  },
});
