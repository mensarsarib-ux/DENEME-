import { COUNTRIES, splitPhone } from "../lib/countries";
import { t } from "../lib/i18n";

/**
 * Telefon alanı: solda ülke alan kodu (varsayılan +90), sağda numara.
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
  const { code, digits } = splitPhone(value);

  function emit(nextCode: string, nextDigits: string) {
    const clean = nextDigits.replace(/\D/g, "").replace(/^0+/, "");
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
        {COUNTRIES.map(([iso, name, dial]) => (
          <option key={iso} value={dial}>
            +{dial} {name}
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
