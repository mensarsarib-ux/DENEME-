import { useRef, useState, type PointerEvent, type ReactNode } from "react";
import { t } from "../lib/i18n";

/** Sağa kaydırınca açılan "Arşive al" düğmesinin genişliği (piksel) */
const ACTION_WIDTH = 96;

/**
 * Listedeki bir satırı sağa kaydırınca altından "Arşive al" düğmesi çıkar.
 * Yatay hareket değilse (dikey kaydırma) satır normal davranır.
 */
export default function SwipeArchive({
  onArchive,
  children,
}: {
  onArchive: () => void;
  children: ReactNode;
}) {
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const offsetRef = useRef(0);
  const start = useRef<{ x: number; y: number; base: number; axis: "x" | "y" | null } | null>(null);
  const moved = useRef(false);

  function place(value: number) {
    offsetRef.current = value;
    setOffset(value);
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    start.current = { x: e.clientX, y: e.clientY, base: offsetRef.current, axis: null };
    moved.current = false;
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const s = start.current;
    if (!s) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (!s.axis) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      s.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      if (s.axis === "x") setDragging(true);
    }
    if (s.axis !== "x") return;
    moved.current = true;
    place(Math.min(ACTION_WIDTH, Math.max(0, s.base + dx)));
  }

  function onPointerEnd() {
    const s = start.current;
    start.current = null;
    if (!s || s.axis !== "x") return;
    setDragging(false);
    place(offsetRef.current > ACTION_WIDTH / 2 ? ACTION_WIDTH : 0);
  }

  return (
    <div className="swipe-row">
      <button type="button" className="swipe-action" onClick={onArchive} tabIndex={offset > 0 ? 0 : -1}>
        {t("Arşive al")}
      </button>
      <div
        className={`swipe-track ${dragging ? "" : "is-settling"}`}
        style={{ transform: `translateX(${offset}px)` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onClickCapture={(e) => {
          // Kaydırma bittikten sonra gelen tıklama satırı açmasın; açıkken tıklama kapatır
          if (moved.current || offsetRef.current > 0) {
            e.stopPropagation();
            e.preventDefault();
            moved.current = false;
            place(0);
          }
        }}
      >
        {children}
      </div>
    </div>
  );
}
