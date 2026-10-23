import { useEffect, useRef } from "react";
import type { Profile } from "../data/mock";
import { haptic } from "../lib/haptics";
import { MENU_ITEMS, SUPPORT_ICON, type MenuPage } from "../lib/menu";

/** Şimdilik menüde gösterilmeyen sayfalar; kodları durur, listeden çıkarılarak tekrar açılabilir */
const HIDDEN_PAGES: MenuPage[] = ["contacts", "reports", "notifications"];

/** "Destek al" düğmesi şimdilik gizli */
const SHOW_SUPPORT = false;
import CompanyLogo from "./CompanyLogo";
import { Svg } from "./Icon";
import { t } from "../lib/i18n";

/**
 * Soldan açılan yarı genişlikte menü penceresi. Seçenekler: işletme profili, hesaplarım, raporlar,
 * notlar, kişiler, bildirimler, ayarlar; biraz boşluktan sonra en altta "Destek al".
 */
export default function MenuDrawer({
  profile,
  unread,
  onNavigate,
  onClose,
}: {
  profile: Profile;
  /** Okunmamış bildirim sayısı; Bildirimler satırında rozet olarak görünür */
  unread: number;
  onNavigate: (page: MenuPage) => void;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    panelRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function open(page: MenuPage) {
    haptic("light");
    onNavigate(page);
  }

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside
        className="drawer"
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={t("Menü")}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="drawer-head">
          <CompanyLogo logo={profile.logo} name={profile.name} size={44} />
          <span className="drawer-company">
            <strong>{profile.name || t("Hesabım")}</strong>
          </span>
          <button className="drawer-close" aria-label={t("Menüyü kapat")} onClick={onClose}>
            ×
          </button>
        </div>

        <nav className="drawer-nav" aria-label={t("Menü seçenekleri")}>
          {MENU_ITEMS.filter((item) => !HIDDEN_PAGES.includes(item.page)).map((item) => (
            <button
              key={item.page}
              type="button"
              className="drawer-item"
              onClick={() => open(item.page)}
            >
              <Svg d={item.icon} />
              <span className="drawer-label">{t(item.label)}</span>
              {item.page === "notifications" && unread > 0 && (
                <span className="drawer-badge" aria-label={t("{n} okunmamış", { n: unread })}>
                  {unread}
                </span>
              )}
              <span className="drawer-chevron" aria-hidden="true">
                ›
              </span>
            </button>
          ))}
        </nav>

        <div className="drawer-spacer" />

        {/* "Destek al" şimdilik gizli; sayfası ve kodu duruyor */}
        {SHOW_SUPPORT && (
          <button type="button" className="drawer-support" onClick={() => open("support")}>
            <Svg d={SUPPORT_ICON} />
            {t("Destek al")}
          </button>
        )}
      </aside>
    </div>
  );
}
