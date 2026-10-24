import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.mensar.hesabim",
  appName: "Hesabım",
  webDir: "dist",
  ios: {
    // Web katmanı ekranın tamamına (güvenli alanların altına) yayılır; içerik güvenli alan boşlukları CSS ile yönetilir
    contentInset: "never",
  },
};

export default config;
