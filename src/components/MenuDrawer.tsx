import { useEffect, useRef, useState } from "react";

/** Kapanış animasyonunun süresi (ms); menü bu süre dolunca gerçekten kapanır */
const CLOSE_MS = 260;
import { haptic } from "../lib/haptics";
import { MENU_ITEMS, SUPPORT_ICON, type MenuPage } from "../lib/menu";
import { CURRENT_PLAN, LIMITS, PLAN_NAME, canAddBusiness, canUseTeam } from "../lib/plan";

/** Şimdilik menüde gösterilmeyen sayfalar; kodları durur, listeden çıkarılarak tekrar açılabilir */
const HIDDEN_PAGES: MenuPage[] = ["contacts", "reports"];
import { Svg } from "./Icon";
import { t } from "../lib/i18n";
import { activeWorkspace, switchWorkspace } from "../lib/storage";
import { STORE_ICON } from "./BusinessPlus";

/**
 * Soldan açılan yarı genişlikte menü penceresi. Seçenekler: işletme profili, hesaplarım, raporlar,
 * notlar, kişiler, bildirimler, ayarlar; biraz boşluktan sonra en altta "Destek al".
 */
export default function MenuDrawer({
  unread,
  businesses,
  canCreateBusiness,
  onNavigate,
  onClose,
  onSignOut,
  isMember = false,
}: {
  /** Okunmamış bildirim sayısı; Bildirimler satırında rozet olarak görünür */
  unread: number;
  /** Geçiş yapılabilecek işletmeler: bu cihazdakiler ve sunucudaki ortak işletmeler */
  businesses: { id: string; name: string }[];
  /** Yalnızca yetkili kişi (sahip ya da bireysel kullanıcı) yeni işletme ekleyebilir */
  canCreateBusiness: boolean;
  onNavigate: (page: MenuPage) => void;
  onClose: () => void;
  /** Giriş yapılmışsa çıkış yapar; yoksa Çıkış yap satırı gösterilmez */
  onSignOut?: () => void;
  /** Ortak işletmede üye: ekibi yetkili yönetir, Ekiplerim paketlere değil açıklamaya götürür */
  isMember?: boolean;
}) {
  const panelRef = useRef<HTMLElement>(null);
  const [bizOpen, setBizOpen] = useState(false);
  const currentId = activeWorkspace();
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    panelRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") requestClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  /** Önce kapanış animasyonu oynar, sonra menü kapanır ve varsa ardından iş yapılır */
  function requestClose(after?: () => void) {
    if (closing) return;
    setClosing(true);
    haptic("light");
    window.setTimeout(() => {
      onClose();
      after?.();
    }, CLOSE_MS);
  }

  /** Sınır doluysa işletme ekleme yerine paketler açılır */
  function addBusiness() {
    haptic("light");
    onNavigate(canAddBusiness(businesses.length) ? "newbusiness" : "plans");
  }

  function open(page: MenuPage) {
    haptic("light");
    // Ücretsiz planda Ekiplerim doğrudan paket seçeneklerini açar (üye için paket alması işe yaramaz)
    const target = page === "team" && !canUseTeam() && !isMember ? "plans" : page;
    requestClose(() => onNavigate(target));
  }

  return (
    <div className={`drawer-backdrop ${closing ? "is-closing" : ""}`} onClick={() => requestClose()}>
      <aside
        className={`drawer ${closing ? "is-closing" : ""}`}
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={t("Menü")}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Plan kartı: mevcut paket ve yükseltme */}
        <div className="plan-card">
          <div className="plan-card-text">
            <span className="plan-card-label">{t("Paket: {p}", { p: t(PLAN_NAME[CURRENT_PLAN]) })}</span>
            <small>{t("{b} işletme · {s} sekme · {k} kayıt", { b: LIMITS[CURRENT_PLAN].businesses === Infinity ? "∞" : LIMITS[CURRENT_PLAN].businesses, s: LIMITS[CURRENT_PLAN].tabs === Infinity ? "∞" : LIMITS[CURRENT_PLAN].tabs, k: LIMITS[CURRENT_PLAN].itemsPerTab === Infinity ? "∞" : LIMITS[CURRENT_PLAN].itemsPerTab })}</small>
          </div>
          <button type="button" className="plan-card-btn" onClick={() => open("plans")}>
            {t("Üst pakete geç")}
          </button>
        </div>

        {/* Açık olan işletmenin adı; dokununca altında işletme listesi (varsa) ve + açılır */}
        <div className="drawer-head">
          <button
            type="button"
            className="drawer-biz-toggle"
            aria-expanded={bizOpen}
            onClick={() => {
              haptic("light");
              setBizOpen((v) => !v);
            }}
          >
            <span className="drawer-biz-mark" aria-hidden="true">
              <Svg d={STORE_ICON} />
            </span>
            <span className="drawer-biz-title">{businesses.find((b) => b.id === currentId)?.name ?? t("Hesabım")}</span>
          </button>
        </div>
        {bizOpen && (
          <>
            {businesses.length > 1 && (
              <div className="drawer-biz-list" role="list" aria-label={t("İşletmelerim")}>
                {businesses.map((b) => {
                  const isCurrent = b.id === currentId;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      role="listitem"
                      className={isCurrent ? "drawer-biz-item is-current" : "drawer-biz-item"}
                      disabled={isCurrent}
                      onClick={() => switchWorkspace(b.id)}
                    >
                      <span className="drawer-biz-mark" aria-hidden="true">
                        <Svg d={STORE_ICON} />
                      </span>
                      <span className="drawer-biz-name">{b.name}</span>
                      {isCurrent && <small aria-hidden="true">✓</small>}
                    </button>
                  );
                })}
              </div>
            )}
            {canCreateBusiness && (
              <button type="button" className="drawer-biz-add" aria-label={t("İşletme ekle")} onClick={addBusiness}>
                +
              </button>
            )}
          </>
        )}

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

        {/* En altta: destek al ve çıkış yap (ekip daveti Ekiplerim sayfasındadır) */}
        <nav className="drawer-nav drawer-footer" aria-label={t("Ekip ve hesap")}>
          <button type="button" className="drawer-item" onClick={() => open("support")}>
            <Svg d={SUPPORT_ICON} />
            <span className="drawer-label">{t("Destek al")}</span>
            <span className="drawer-chevron" aria-hidden="true">›</span>
          </button>
          {onSignOut && (
            <button
              type="button"
              className="drawer-item drawer-signout"
              onClick={() => {
                if (window.confirm(t("Çıkış yapmak istediğinize emin misiniz? Verileriniz hesabınızda saklanır."))) {
                  haptic("warning");
                  onSignOut();
                }
              }}
            >
              <span className="drawer-label">{t("Çıkış yap")}</span>
            </button>
          )}
        </nav>
      </aside>
    </div>
  );
}
