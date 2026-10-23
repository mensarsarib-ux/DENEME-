import { useLayoutEffect, useRef, type ReactNode } from "react";
import { haptic } from "../lib/haptics";
import { locale, t } from "../lib/i18n";

/** Bir satırın yüksekliği (px); tekerlekte üç satır görünür */
const ITEM = 40;
const VISIBLE = 5;
const MIN_YEAR = 1990;

const pad = (n: number) => String(n).padStart(2, "0");
const toIso = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;
const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

/** Bugünün tarihi YYYY-MM-DD biçiminde */
export function todayIso(): string {
  const n = new Date();
  return toIso(n.getFullYear(), n.getMonth() + 1, n.getDate());
}

/** Bir sütun: parmakla kaydırılır, ortadaki satır seçilir */
function Wheel({
  items,
  selected,
  label,
  onPick,
}: {
  items: { value: number; text: string }[];
  selected: number;
  label: string;
  onPick: (value: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const timer = useRef<number>();
  const index = Math.max(0, items.findIndex((i) => i.value === selected));

  // Dışarıdan değer değişince (ör. ay değişince gün sınırı) tekerleği o satıra getir
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (Math.abs(el.scrollTop - index * ITEM) > 1) el.scrollTop = index * ITEM;
  }, [index]);

  return (
    <div className="wheel-col" ref={ref} role="listbox" aria-label={label}
      onScroll={() => {
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => {
          const el = ref.current;
          if (!el) return;
          const i = Math.min(items.length - 1, Math.max(0, Math.round(el.scrollTop / ITEM)));
          if (items[i].value !== selected) {
            haptic("light");
            onPick(items[i].value);
          }
        }, 120);
      }}>
      <div className="wheel-pad" />
      {items.map((it) => (
        <div key={it.value} role="option" aria-selected={it.value === selected}
          className={`wheel-item ${it.value === selected ? "is-sel" : ""}`}>
          {it.text}
        </div>
      ))}
      <div className="wheel-pad" />
    </div>
  );
}

/**
 * Tekerlekli tarih seçici: gün, ay, yıl. En fazla bugüne kadar seçilebilir (gelecek tarih yok).
 * Altta seçilen tarih yazılır.
 */
export default function WheelDate({
  value,
  onChange,
  max = todayIso(),
}: {
  value: string;
  onChange: (iso: string) => void;
  /** En geç seçilebilecek tarih (YYYY-MM-DD) */
  max?: string;
}) {
  const [y, m, d] = value.split("-").map(Number);
  const [maxY, maxM] = max.split("-").map(Number);

  const set = (ny: number, nm: number, nd: number): void => {
    const last = new Date(ny, nm, 0).getDate();
    let next = toIso(ny, nm, Math.min(nd, last));
    if (next > max) next = max;
    onChange(next);
  };

  const monthName = (mo: number) =>
    new Date(2000, mo - 1, 1).toLocaleDateString(locale(), { month: "long" });
  const days = range(1, new Date(y, m, 0).getDate()).map((v) => ({ value: v, text: String(v) }));
  const months = range(1, y === maxY ? maxM : 12).map((v) => ({ value: v, text: monthName(v) }));
  const years = range(MIN_YEAR, maxY)
    .reverse()
    .map((v) => ({ value: v, text: String(v) }));

  const shown = toIso(y, m, d).split("-").reverse().join(".");

  const column = (label: string, node: ReactNode) => (
    <div className="wheel-group">
      <span className="wheel-label">{label}</span>
      <div className="wheel-wrap">
        {node}
        <div className="wheel-band" aria-hidden="true" />
      </div>
    </div>
  );

  return (
    <div className="wheel-date">
      <div className="wheel-row">
        {column(t("Gün"), <Wheel label={t("Gün")} items={days} selected={d} onPick={(v) => set(y, m, v)} />)}
        {column(t("Ay"), <Wheel label={t("Ay")} items={months} selected={m} onPick={(v) => set(y, v, d)} />)}
        {column(t("Yıl"), <Wheel label={t("Yıl")} items={years} selected={y} onPick={(v) => set(v, m, d)} />)}
      </div>
      <p className="wheel-shown" aria-live="polite">{shown}</p>
    </div>
  );
}

export const WHEEL_HEIGHT = ITEM * VISIBLE;
