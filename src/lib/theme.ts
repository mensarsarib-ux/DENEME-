import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";

/** Görünüm: koyu, açık ya da telefonun ayarına göre. Bu telefona özeldir (hesapla eşitlenmez). */
export type ThemeChoice = "dark" | "light" | "system";

const THEME_KEY = "hesabim:theme";
const media = typeof window !== "undefined" ? window.matchMedia("(prefers-color-scheme: light)") : null;

export function getThemeChoice(): ThemeChoice {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "dark" || saved === "light" || saved === "system") return saved;
  } catch {
    /* depolama erişilemiyorsa varsayılan */
  }
  return "dark";
}

/** Seçime göre ekranda gösterilecek tema */
const resolve = (choice: ThemeChoice): "dark" | "light" =>
  choice === "system" ? (media?.matches ? "light" : "dark") : choice;

/** Ana ekranın üstü her temada koyu renkli degradedir; orada durum çubuğu yazısı açık renk kalır */
let onDarkHeader = true;

function applyStatusBar() {
  if (!Capacitor.isNativePlatform()) return;
  const light = document.documentElement.dataset.theme === "light" && !onDarkHeader;
  // Style.Light: açık zemin için koyu yazı; Style.Dark: koyu zemin için açık yazı
  void StatusBar.setStyle({ style: light ? Style.Light : Style.Dark }).catch(() => undefined);
}

/** Ekranın üstü koyu degrade mi (ana ekran) yoksa sayfa zemini mi; durum çubuğu yazı rengi buna göre */
export function setDarkHeader(dark: boolean) {
  onDarkHeader = dark;
  applyStatusBar();
}

/** Temayı uygular: sayfa renkleri ve iPhone durum çubuğunun (saat, pil) yazı rengi */
export function applyTheme(choice: ThemeChoice = getThemeChoice()) {
  document.documentElement.dataset.theme = resolve(choice);
  applyStatusBar();
}

export function setThemeChoice(choice: ThemeChoice) {
  try {
    localStorage.setItem(THEME_KEY, choice);
  } catch {
    /* saklanamazsa yalnızca bu oturumda geçerli */
  }
  applyTheme(choice);
}

// Telefonun görünümü değişince "Sistem" seçiliyse tema da değişir
media?.addEventListener("change", () => {
  if (getThemeChoice() === "system") applyTheme("system");
});
