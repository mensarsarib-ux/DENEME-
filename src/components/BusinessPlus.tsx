import { useState } from "react";
import { t } from "../lib/i18n";
import { haptic } from "../lib/haptics";

/** İşletme paketleri; ayrıntılı satın alma akışı daha sonra bağlanacak */
const PLANS = [2, 5, 10];

/**
 * Firma kutusuna basılı tutunca kutunun hemen altında küçük bir "+" çıkar.
 * "+" dokununca işletme paketleri aynı yerde açılır.
 */
export default function BusinessPlus({
  top,
  left,
  width,
  onClose,
}: {
  /** Firma kutusunun ekrandaki konumu (piksel) */
  top: number;
  left: number;
  width: number;
  onClose: () => void;
}) {
  const [plansOpen, setPlansOpen] = useState(false);

  return (
    <div className="biz-layer" onClick={onClose}>
      {!plansOpen ? (
        <button
          type="button"
          className="biz-plus"
          style={{ top: top + 8, left: left + width / 2 }}
          aria-label={t("İşletme paketleri")}
          onClick={(e) => {
            e.stopPropagation();
            haptic("light");
            setPlansOpen(true);
          }}
        >
          +
        </button>
      ) : (
        <div
          className="biz-plans"
          role="dialog"
          aria-label={t("İşletme paketleri")}
          style={{ top: top + 8, left, width }}
          onClick={(e) => e.stopPropagation()}
        >
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
