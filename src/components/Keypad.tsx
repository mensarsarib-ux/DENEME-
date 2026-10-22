import { useRef, useState } from "react";
import { haptic } from "../lib/haptics";
import { Svg } from "./Icon";

const MAX_LENGTH = 14;

/** Bir tuşun, çok kısa dokunuşlarda bile görünür kalacağı en az süre (ms) */
const MIN_PRESS_MS = 110;

const DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

/** Tutar girişi için ekran tuş takımı. Değer "12,50" gibi metin olarak tutulur. */
export default function Keypad({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  // Basılı görünen tuş: iOS'ta olduğu gibi basınca anında, bırakınca yavaşça söner
  const [down, setDown] = useState<string | null>(null);
  const downAt = useRef(0);
  const releaseTimer = useRef<number>();

  const gesture = (key: string) => ({
    onPointerDown: () => {
      window.clearTimeout(releaseTimer.current);
      downAt.current = performance.now();
      setDown(key);
    },
    onPointerUp: release,
    onPointerCancel: release,
    onPointerLeave: release,
  });

  function release() {
    const wait = Math.max(0, MIN_PRESS_MS - (performance.now() - downAt.current));
    window.clearTimeout(releaseTimer.current);
    releaseTimer.current = window.setTimeout(() => setDown(null), wait);
  }

  function press(key: string) {
    haptic("light");
    if (key === "back") {
      onChange(value.slice(0, -1));
      return;
    }
    if (key === ",") {
      if (value.includes(",")) return;
      onChange(value === "" ? "0," : `${value},`);
      return;
    }
    if (value.length >= MAX_LENGTH) return;
    const decimals = value.split(",")[1];
    if (decimals !== undefined && decimals.length >= 2) return;
    // Baştaki gereksiz sıfırı kaldır: "0" + "5" → "5"
    onChange(value === "0" ? key : value + key);
  }

  return (
    <div className="keypad" role="group" aria-label="Tuş takımı">
      {DIGITS.map((key) => (
        <button
          key={key}
          type="button"
          className={down === key ? "is-down" : undefined}
          {...gesture(key)}
          onClick={() => press(key)}
        >
          <span className="key-num">{key}</span>
        </button>
      ))}
      <button
        type="button"
        className={`key-fn ${down === "," ? "is-down" : ""}`}
        aria-label="Virgül"
        {...gesture(",")}
        onClick={() => press(",")}
      >
        <span className="key-num">,</span>
      </button>
      <button
        type="button"
        className={down === "0" ? "is-down" : undefined}
        {...gesture("0")}
        onClick={() => press("0")}
      >
        <span className="key-num">0</span>
      </button>
      <button
        type="button"
        className={`key-fn ${down === "back" ? "is-down" : ""}`}
        aria-label="Sil"
        {...gesture("back")}
        onClick={() => press("back")}
      >
        <Svg d="M20 6H9l-5 6 5 6h11zM13 10l4 4M17 10l-4 4" />
      </button>
    </div>
  );
}
