import { Svg } from "./Icon";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ",", "0", "back"];
const MAX_LENGTH = 14;

/** Tutar girişi için ekran tuş takımı. Değer "12,50" gibi metin olarak tutulur. */
export default function Keypad({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  function press(key: string) {
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
      {KEYS.map((key) => (
        <button key={key} type="button" onClick={() => press(key)}>
          {key === "back" ? <Svg d="M20 6H9l-5 6 5 6h11zM13 10l4 4M17 10l-4 4" /> : key}
        </button>
      ))}
    </div>
  );
}
