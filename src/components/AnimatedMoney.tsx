import { useEffect, useRef, useState } from "react";
import { money, moneyRound } from "../lib/format";

/** Hedef değere doğru yumuşakça sayan değer. Hareket azaltma açıksa doğrudan atlar. */
function useCountUp(target: number, duration = 800): number {
  const [value, setValue] = useState(0);
  const current = useRef(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      current.current = target;
      setValue(target);
      return;
    }
    const begin = current.current;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      current.current = begin + (target - begin) * eased;
      setValue(current.current);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return value;
}

export default function AnimatedMoney({
  value,
  className,
  precise = false,
}: {
  value: number;
  className?: string;
  /** true: kuruşlu gösterim, false: tam sayı */
  precise?: boolean;
}) {
  const shown = useCountUp(value);
  return (
    <span className={className}>
      {(precise ? money : moneyRound).format(shown)}
    </span>
  );
}
