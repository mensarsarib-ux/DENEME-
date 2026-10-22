import { useEffect, useRef, useState, type PointerEvent } from "react";
import { haptic } from "./haptics";

const DELAY_MS = 500;
const MOVE_TOLERANCE = 8;

/**
 * Bir alanda basılı tutmayı algılar (dokunma, fare, sağ tık ve klavyedeki menü tuşu).
 * Parmak kayarsa (sayfa kaydırılıyorsa) iptal olur. Basılı tutmanın ardından gelen
 * "click" yok sayılır, böylece altındaki bir butona basılmış gibi olmaz.
 * Düğmelerin üzerinde başlayan basışlar sayılmaz.
 */
export function useLongPress(onLongPress: () => void) {
  const timer = useRef<number | null>(null);
  const origin = useRef({ x: 0, y: 0 });
  const fired = useRef(false);
  const callback = useRef(onLongPress);
  callback.current = onLongPress;
  const [pressing, setPressing] = useState(false);

  function cancel() {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  }

  function end() {
    cancel();
    setPressing(false);
  }

  useEffect(() => cancel, []);

  const handlers = {
    onPointerDown(event: PointerEvent) {
      fired.current = false;
      if (event.button !== 0) return;
      if ((event.target as Element).closest("button, a, input")) return;
      origin.current = { x: event.clientX, y: event.clientY };
      cancel();
      setPressing(true);
      timer.current = window.setTimeout(() => {
        timer.current = null;
        fired.current = true;
        setPressing(false);
        haptic("medium");
        callback.current();
      }, DELAY_MS);
    },
    onPointerMove(event: PointerEvent) {
      if (timer.current === null) return;
      const { x, y } = origin.current;
      if (Math.hypot(event.clientX - x, event.clientY - y) > MOVE_TOLERANCE) {
        end();
      }
    },
    onPointerUp: end,
    onPointerLeave: end,
    onPointerCancel: end,
    onContextMenu(event: React.MouseEvent) {
      // Sağ tık, menü tuşu ve bazı telefonlardaki uzun basma
      if ((event.target as Element).closest("input")) return;
      event.preventDefault();
      end();
      fired.current = true;
      haptic("medium");
      callback.current();
    },
    onClickCapture(event: React.MouseEvent) {
      if (fired.current) {
        fired.current = false;
        event.stopPropagation();
        event.preventDefault();
      }
    },
  };

  return { handlers, pressing };
}
