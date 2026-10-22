import { totalsBetween, type Period, type Transaction } from "../data/mock";

/** Grafikte bir sütun grubu: bir günün, haftanın, ayın veya yılın geliri ve gideri */
export interface SeriesPoint {
  key: string;
  /** Sütunun altındaki kısa etiket */
  label: string;
  /** Seçilince gösterilen tam başlık */
  title: string;
  /** Gelir = satış toplamı */
  gelir: number;
  /** Gider = alış toplamı */
  gider: number;
}

export interface Series {
  points: SeriesPoint[];
  /** İçinde bulunulan gün/hafta/ay/yıl */
  currentIndex: number;
  /** Ekranda aynı anda görünen grup sayısı; toplamdan azsa grafik yana kaydırılır */
  visible: number;
}

const DAYS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
const MONTHS = [
  "Oca", "Şub", "Mar", "Nis", "May", "Haz",
  "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara",
];

const pad = (n: number) => String(n).padStart(2, "0");
const shortDate = (d: Date) => `${d.getDate()}.${pad(d.getMonth() + 1)}`;

function point(
  list: Transaction[],
  key: string,
  label: string,
  title: string,
  start: Date,
  end: Date,
): SeriesPoint {
  const t = totalsBetween(list, [start, end]);
  return { key, label, title, gelir: t.satis, gider: t.alis };
}

/**
 * Seçilen döneme göre grafik verisi:
 * günlük: bu haftanın 7 günü, haftalık: son 4 hafta,
 * aylık: son 12 ay (6'sı görünür, kalanı kaydırınca), yıllık: son 5 yıl.
 */
export function buildSeries(
  list: Transaction[],
  period: Period,
  now = new Date(),
): Series {
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();
  // Haftanın kaçıncı günü (pazartesi = 0)
  const dayOfWeek = (now.getDay() + 6) % 7;

  if (period === "daily") {
    const points = DAYS.map((label, i) => {
      const start = new Date(y, m, d - dayOfWeek + i);
      const end = new Date(y, m, d - dayOfWeek + i + 1);
      const title = start.toLocaleDateString("tr-TR", {
        day: "numeric",
        month: "long",
        weekday: "long",
      });
      return point(list, `d${i}`, label, title, start, end);
    });
    return { points, currentIndex: dayOfWeek, visible: 7 };
  }

  if (period === "weekly") {
    const points = [3, 2, 1, 0].map((back) => {
      const start = new Date(y, m, d - dayOfWeek - 7 * back);
      const end = new Date(y, m, d - dayOfWeek - 7 * back + 7);
      const last = new Date(y, m, d - dayOfWeek - 7 * back + 6);
      const range = `${shortDate(start)}–${shortDate(last)}`;
      const name =
        back === 0 ? "Bu hafta" : back === 1 ? "Geçen hafta" : `${back} hafta önce`;
      return point(list, `w${back}`, range, `${name} (${range})`, start, end);
    });
    return { points, currentIndex: 3, visible: 4 };
  }

  if (period === "monthly") {
    const points = Array.from({ length: 12 }, (_, i) => {
      const back = 11 - i;
      const start = new Date(y, m - back, 1);
      const end = new Date(y, m - back + 1, 1);
      const title = start.toLocaleDateString("tr-TR", {
        month: "long",
        year: "numeric",
      });
      return point(list, `m${back}`, MONTHS[start.getMonth()], title, start, end);
    });
    return { points, currentIndex: 11, visible: 6 };
  }

  const points = Array.from({ length: 5 }, (_, i) => {
    const year = y - (4 - i);
    return point(
      list,
      `y${year}`,
      String(year),
      String(year),
      new Date(year, 0, 1),
      new Date(year + 1, 0, 1),
    );
  });
  return { points, currentIndex: 4, visible: 5 };
}
