import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.mensar.hesabim",
  appName: "Hesabım",
  webDir: "dist",
  ios: {
    // Web katmanı ekranın tamamına (güvenli alanların altına) yayılır; içerik güvenli alan boşlukları CSS ile yönetilir
    contentInset: "never",
  },
  plugins: {
    // Klavye açılınca web görünümü küçülmesin; giriş paneli klavye yüksekliği kadar kendisi yukarı kalkar
    Keyboard: { resize: "none" },
  },
};

export default config;
