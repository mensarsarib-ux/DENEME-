/** Yan menüdeki sayfalar */
export type MenuPage =
  | "profile"
  | "accounts"
  | "reports"
  | "notes"
  | "contacts"
  | "notifications"
  | "settings"
  | "support"
  | "privacy"
  | "plans"
  | "newbusiness"
  | "join";

export const MENU_ITEMS: { page: MenuPage; label: string; icon: string }[] = [
  { page: "profile", label: "İşletme profili", icon: "M4 21V8l8-5 8 5v13M9 21v-6h6v6M8 11h.01M12 11h.01M16 11h.01" },
  { page: "accounts", label: "Hesaplarım", icon: "M3 7h18v10H3zM3 11h18M7 15h3" },
  { page: "plans", label: "İşletme paketleri", icon: "M4 20V8l8-4 8 4v12M9 20v-6h6v6" },
  { page: "reports", label: "Raporlar", icon: "M5 20V10M11 20V4M17 20v-7" },
  { page: "notes", label: "Notlar", icon: "M6 3h12v18H6zM9 8h6M9 12h6M9 16h4" },
  { page: "contacts", label: "Kişiler", icon: "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 20a6 6 0 0 1 12 0M17 11a2.5 2.5 0 1 0 0-5M16 14a5 5 0 0 1 5 5" },
  { page: "notifications", label: "Bildirimler", icon: "M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 21h4" },
  { page: "settings", label: "Ayarlar", icon: "M4 7h10M18 7h2M4 17h2M10 17h10M14 4v6M8 14v6" },
];

export const PRIVACY_ICON = "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6zM9 12l2 2 4-4";

export const SUPPORT_ICON =
  "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5M12 17h.01";
