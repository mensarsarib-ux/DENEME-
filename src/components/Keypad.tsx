import { Svg } from "./Icon";

const MAX_LENGTH = 14;

/** Sayısal klavye düzeni: rakamlar ve altlarındaki harf grupları */
const DIGITS: { key: string; letters?: string }[] = [
  { key: "1" },
  { key: "2", letters: "ABC" },
  { key: "3", letters: "DEF" },
  { key: "4", letters: "GHI" },
  { key: "5", letters: "JKL" },
  { key: "6", letters: "MNO" },
  { key: "7", letters: "PQRS" },
  { key: "8", letters: "TUV" },
  { key: "9", letters: "WXYZ" },
];

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
      {DIGITS.map(({ key, letters }) => (
        <button key={key} type="button" onClick={() => press(key)}>
          <span className="key-num">{key}</span>
          {letters && <span className="key-letters">{letters}</span>}
        </button>
      ))}
      <button
        type="button"
        className="key-fn"
        aria-label="Virgül"
        onClick={() => press(",")}
      >
        <span className="key-num">,</span>
      </button>
      <button type="button" onClick={() => press("0")}>
        <span className="key-num">0</span>
      </button>
      <button
        type="button"
        className="key-fn"
        aria-label="Sil"
        onClick={() => press("back")}
      >
        <Svg d="M20 6H9l-5 6 5 6h11zM13 10l4 4M17 10l-4 4" />
      </button>
    </div>
  );
}
