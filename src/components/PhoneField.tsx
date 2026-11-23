import { useEffect, useMemo, useRef, useState } from "react";
import { COUNTRIES, splitPhone } from "../lib/countries";
import { deviceRegion } from "../lib/region";
import { regionName, t } from "../lib/i18n";

/** Listede önce telefonun bulunduğu ülke, sonra Türkiye, sonra diğerleri */
const ORDERED = (() => {
  const region = deviceRegion();
  const first = COUNTRIES.filter(([iso]) => iso === region);
  return [...first, ...COUNTRIES.filter(([iso]) => iso !== region)];
})();

/** ISO ülke kodundan bayrak emojisi (TR → 🇹🇷) */
export function flagOf(iso: string): string {
  if (!/^[A-Z]{2}$/.test(iso)) return "🏳️";
  return String.fromCodePoint(...[...iso].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

/** Alan kodundan ülke: aynı kodu paylaşan ülkelerde (ör. +1) önce seçili, sonra telefonun bölgesi, sonra ilk eşleşen */
function isoForDial(dial: string, preferred: string | null): string {
  if (preferred && COUNTRIES.some(([iso, , d]) => iso === preferred && d === dial)) return preferred;
  const region = deviceRegion();
  if (region && COUNTRIES.some(([iso, , d]) => iso === region && d === dial)) return region;
  return COUNTRIES.find(([, , d]) => d === dial)?.[0] ?? "TR";
}

/** Aramada Türkçe karakter ve büyük/küçük harf farkı gözetilmez */
const fold = (s: string) =>
  s.toLocaleLowerCase("tr").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ı/g, "i");

/**
 * Telefon alanı: solda bayrak ve alan kodu (dokununca aranabilir ülke listesi açılır), sağda numara.
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
  // Aynı alan kodunu paylaşan ülkelerde (ABD/Kanada +1) kullanıcının seçtiği ülke
  const [chosenIso, setChosenIso] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const code = parsed.digits ? parsed.code : (emptyCode ?? parsed.code);
  const digits = parsed.digits;
  const iso = isoForDial(code, chosenIso);

  function emit(nextCode: string, nextDigits: string) {
    const clean = nextDigits.replace(/\D/g, "").replace(/^0+/, "");
    if (!clean) setEmptyCode(nextCode);
    onChange(clean ? `+${nextCode}${clean}` : "");
  }

  const list = useMemo(() => {
    const q = fold(query.trim()).replace(/^\+/, "");
    if (!q) return ORDERED;
    return ORDERED.filter(([cIso, name, dial]) => fold(regionName(cIso, name)).includes(q) || dial.startsWith(q));
  }, [query]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    const timer = window.setTimeout(() => searchRef.current?.focus(), 250);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="phone-field">
      <button
        type="button"
        className="phone-code"
        aria-label={`${t("Ülke alan kodu")}: ${regionName(iso, COUNTRIES.find(([c]) => c === iso)?.[1] ?? iso)} +${code}`}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        <span className="phone-flag" aria-hidden="true">{flagOf(iso)}</span>
        <span className="phone-dial">+{code}</span>
        <svg className="phone-caret" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
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
            const p = splitPhone(raw);
            setChosenIso(null);
            emit(p.code, p.digits);
          } else {
            emit(code, raw);
          }
        }}
      />

      {open && (
        <div className="country-backdrop" onClick={() => setOpen(false)}>
          <div
            className="country-sheet"
            role="dialog"
            aria-modal="true"
            aria-label={t("Ülke seçin")}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="country-grip" aria-hidden="true" />
            <div className="country-head">
              <strong>{t("Ülke seçin")}</strong>
              <button type="button" className="country-close" aria-label={t("Kapat")} onClick={() => setOpen(false)}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
            <input
              ref={searchRef}
              className="country-search"
              type="search"
              placeholder={t("Ülke ya da kod ara")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <ul className="country-list">
              {list.map(([cIso, name, dial]) => (
                <li key={cIso}>
                  <button
                    type="button"
                    className={`country-row ${cIso === iso ? "is-on" : ""}`}
                    onClick={() => {
                      setChosenIso(cIso);
                      emit(dial, digits);
                      setOpen(false);
                    }}
                  >
                    <span className="country-flag" aria-hidden="true">{flagOf(cIso)}</span>
                    <span className="country-name">{regionName(cIso, name)}</span>
                    <span className="country-dial">+{dial}</span>
                  </button>
                </li>
              ))}
              {list.length === 0 && <li className="country-empty">{t("Sonuç bulunamadı")}</li>}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
