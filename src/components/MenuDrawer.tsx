import { useEffect, useRef } from "react";
import type { Profile } from "../data/mock";
import { haptic } from "../lib/haptics";
import { MENU_ITEMS, SUPPORT_ICON, type MenuPage } from "../lib/menu";
import { Svg } from "./Icon";

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
        aria-label="Menü"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="drawer-head">
          <span className="company-logo" aria-hidden="true">
            <img src="/logo.svg" alt="" />
          </span>
          <span className="drawer-company">
            <strong>{profile.name || "Hesabım"}</strong>
            <small>{profile.owner || profile.email || "Şirket adınız"}</small>
          </span>
          <button className="drawer-close" aria-label="Menüyü kapat" onClick={onClose}>
            ×
          </button>
        </div>

        <nav className="drawer-nav" aria-label="Menü seçenekleri">
          {MENU_ITEMS.map((item) => (
            <button
              key={item.page}
              type="button"
              className="drawer-item"
              onClick={() => open(item.page)}
            >
              <Svg d={item.icon} />
              <span className="drawer-label">{item.label}</span>
              {item.page === "notifications" && unread > 0 && (
                <span className="drawer-badge" aria-label={`${unread} okunmamış`}>
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

        <button type="button" className="drawer-support" onClick={() => open("support")}>
          <Svg d={SUPPORT_ICON} />
          Destek al
        </button>
      </aside>
    </div>
  );
}
