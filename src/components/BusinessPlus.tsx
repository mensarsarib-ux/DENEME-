import { useState } from "react";
import { t } from "../lib/i18n";
import { haptic } from "../lib/haptics";

/** İşletme paketleri; ayrıntılı satın alma akışı daha sonra bağlanacak */
const PLANS = [2, 5, 10];

/**
 * Firma logosuna dokununca açılır: siyah arka plan üzerinde logonun altından kayarak gelen
 * büyük bir "+" ve yanında "İşletme ekle". Dokununca işletme paketleri aynı yerde açılır.
 */
export default function BusinessPlus({
  top,
  left,
  onClose,
}: {
  /** Logonun alt kenarı ve sol kenarı (piksel) */
  top: number;
  left: number;
  onClose: () => void;
}) {
  const [plansOpen, setPlansOpen] = useState(false);

  function open() {
    haptic("medium");
    setPlansOpen(true);
  }

  return (
    <div className="biz-layer" onClick={onClose}>
      <div className="biz-row" style={{ top: top + 10, left }} onClick={(e) => e.stopPropagation()}>
        <button type="button" className="biz-plus" aria-label={t("İşletme ekle")} onClick={open}>
          +
        </button>
        {!plansOpen && (
          <button type="button" className="biz-add" onClick={open}>
            {t("İşletme ekle")}
          </button>
        )}
      </div>

      {plansOpen && (
        <div className="biz-plans" role="dialog" aria-label={t("İşletme paketleri")} style={{ top: top + 80, left }} onClick={(e) => e.stopPropagation()}>
          {PLANS.map((n) => (
            <button key={n} type="button" className="biz-plan" disabled>
              <span>{t("{n} işletme", { n })}</span>
              <small>{t("Yakında")}</small>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
