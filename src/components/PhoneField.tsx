import { useState } from "react";
import { COUNTRIES, splitPhone } from "../lib/countries";
import { deviceRegion } from "../lib/region";
import { regionName, t } from "../lib/i18n";

/** Listede önce telefonun bulunduğu ülke, sonra Türkiye, sonra diğerleri */
const ORDERED = (() => {
  const region = deviceRegion();
  const first = COUNTRIES.filter(([iso]) => iso === region);
  return [...first, ...COUNTRIES.filter(([iso]) => iso !== region)];
})();

/**
 * Telefon alanı: solda ülke alan kodu (varsayılan: telefonun bölgesi), sağda numara.
 * Değer "+905551234567" biçiminde saklanır; boşsa "".
 * Numara başındaki 0 otomatik atılır, kullanıcı 0 yazmadan girer.
 */
export default function PhoneField({
  id,
  value,
  onChange,
  autoComplete = "tel",
}: {
  id: string;
  value: string;
  onChange: (next: string) => void;
  autoComplete?: string;
}) {
  const parsed = splitPhone(value);
  // Numara henüz boşken seçilen alan kodu kaybolmasın (boş değer kodu taşımaz)
  const [emptyCode, setEmptyCode] = useState<string | null>(null);
  const code = parsed.digits ? parsed.code : (emptyCode ?? parsed.code);
  const digits = parsed.digits;

  function emit(nextCode: string, nextDigits: string) {
    const clean = nextDigits.replace(/\D/g, "").replace(/^0+/, "");
    if (!clean) setEmptyCode(nextCode);
    onChange(clean ? `+${nextCode}${clean}` : "");
  }

  return (
    <div className="phone-field">
      <select
        className="phone-code"
        aria-label={t("Ülke alan kodu")}
        value={code}
        onChange={(e) => emit(e.target.value, digits)}
      >
        {ORDERED.map(([iso, name, dial]) => (
          <option key={iso} value={dial}>
            +{dial} {regionName(iso, name)}
          </option>
        ))}
      </select>
      <input
        id={id}
        type="tel"
        inputMode="tel"
        autoComplete={autoComplete}
        placeholder={t("5xx xxx xx xx")}
        value={digits}
        onChange={(e) => {
          const raw = e.target.value;
          // Yapıştırılan "+90 555…" gibi girişlerde ülke kodu da okunur
          if (raw.trim().startsWith("+")) {
            const parsed = splitPhone(raw);
            emit(parsed.code, parsed.digits);
          } else {
            emit(code, raw);
          }
        }}
      />
    </div>
  );
}
