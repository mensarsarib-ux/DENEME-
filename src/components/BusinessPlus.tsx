import { t } from "../lib/i18n";
import { haptic } from "../lib/haptics";

/**
 * Firma logosuna dokununca açılır: siyah arka plan üzerinde logonun altından kayarak gelen
 * büyük bir "+" ve yanında "İşletme ekle". Dokununca işletme paketleri aynı yerde açılır.
 */
export default function BusinessPlus({
  top,
  left,
  onClose,
  onAdd,
}: {
  /** Logonun alt kenarı ve sol kenarı (piksel) */
  top: number;
  left: number;
  onClose: () => void;
  /** + veya "İşletme ekle" ile işletme paketleri sayfasına geçilir */
  onAdd: () => void;
}) {
  function open() {
    haptic("medium");
    onAdd();
  }

  return (
    <div className="biz-layer" onClick={onClose}>
      <div className="biz-row" style={{ top: top + 10, left }} onClick={(e) => e.stopPropagation()}>
        <button type="button" className="biz-plus" aria-label={t("İşletme ekle")} onClick={open}>
          +
        </button>
        <button type="button" className="biz-add" onClick={open}>
          {t("İşletme ekle")}
        </button>
      </div>

    </div>
  );
}
