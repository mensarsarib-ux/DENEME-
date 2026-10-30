import type { Account, Customer, Profile, Transaction } from "../data/mock";
import { signOf, transactionsOf } from "../data/mock";
import { currencyCode, money } from "./format";
import { locale, t } from "./i18n";

/** A4, 150 dpi */
const W = 1240;
const H = 1754;
const M = 80;
const FONT = '-apple-system, "Segoe UI", Helvetica, Arial, sans-serif';

const INK = "#1f2933";
const MUTED = "#6b7683";
const LINE = "#d9dee5";
const RULE = "#2b3440";

export interface StatementInput {
  party: Customer;
  profile: Profile;
  accounts: Account[];
  transactions: Transaction[];
  /** Dönem: YYYY-MM-DD biçiminde; ikisi de boşsa tüm hareketler */
  range?: { from?: string; to?: string };
}

export interface StatementRow {
  date: string;
  type: string;
  account: string;
  description: string;
  debit: number | null;
  credit: number | null;
  balance: number;
  /** Seçilen dönemden önceki bakiyeyi taşıyan satır (tutar yazılmaz) */
  carry?: boolean;
}

export interface StatementData {
  rows: StatementRow[];
  totalDebit: number;
  totalCredit: number;
  balance: number;
  /** Dönem açıklaması: "Tüm hareketler" ya da tarih aralığı */
  period: string;
}

const two = (n: number) => String(n).padStart(2, "0");

/** "22.10.26 13:15" */
const dateText = (iso: string) => {
  const d = new Date(iso);
  return `${two(d.getDate())}.${two(d.getMonth() + 1)}.${two(d.getFullYear() % 100)} ${two(d.getHours())}:${two(d.getMinutes())}`;
};

/** Para simgesiz tutar: "24.525,00" */
const plain = (value: number) =>
  new Intl.NumberFormat(locale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

/** Hareketleri tarih sırasıyla, yürüyen bakiyeyle hesaplar. Borç: satış ve ödeme (+), alacak: tahsilat ve alış (−). */
const dayText = (day: string) => day.split("-").reverse().join(".");

export function buildStatement({ party, accounts, transactions, range }: StatementInput): StatementData {
  const from = range?.from ? new Date(`${range.from}T00:00`).getTime() : null;
  const to = range?.to ? new Date(`${range.to}T00:00`).getTime() + 86_400_000 : null;
  const all = transactionsOf(transactions, party.id);

  // Dönemden önceki bakiye: dönem başında taşınır
  let carried = 0;
  if (from !== null) {
    for (const tx of all) if (new Date(tx.date).getTime() < from) carried += signOf(tx.type) * tx.amount;
  }
  const inRange = all.filter((tx) => {
    const d = new Date(tx.date).getTime();
    return (from === null || d >= from) && (to === null || d < to);
  });

  let balance = carried;
  let totalDebit = 0;
  let totalCredit = 0;
  const rows: StatementRow[] = [];
  if (from !== null && (carried !== 0 || all.some((tx) => new Date(tx.date).getTime() < from))) {
    rows.push({ date: "", type: t("Devreden bakiye"), account: "", description: "", debit: null, credit: null, balance, carry: true });
  }
  for (const tx of inRange) {
    const sign = signOf(tx.type);
    balance += sign * tx.amount;
    if (sign > 0) totalDebit += tx.amount;
    else totalCredit += tx.amount;
    rows.push({
      date: dateText(tx.date),
      type: t(tx.type),
      account: tx.account ? t(accounts.find((a) => a.id === tx.account)?.name ?? "") : "",
      description: tx.description,
      debit: sign > 0 ? tx.amount : null,
      credit: sign < 0 ? tx.amount : null,
      balance,
    });
  }

  const period =
    from === null && to === null
      ? t("Tüm hareketler")
      : from !== null && to === null
        ? t("{date} tarihinden itibaren", { date: dayText(range!.from!) })
        : from === null && to !== null
          ? t("{date} tarihine kadar", { date: dayText(range!.to!) })
          : `${dayText(range!.from!)} – ${dayText(range!.to!)}`;

  return { rows, totalDebit, totalCredit, balance, period };
}

/** "Alacağınız: ₺1.000,00" / "Borcunuz: ₺500,00" */
export function balanceText(balance: number): string {
  if (balance > 0) return t("Alacağınız: {amount}", { amount: money.format(balance) });
  if (balance < 0) return t("Borcunuz: {amount}", { amount: money.format(-balance) });
  return t("Bakiye: {amount}", { amount: money.format(0) });
}

/**
 * Kişiye gönderilen kısa hesap özeti (WhatsApp, SMS, e-posta). Karşı tarafın gözünden yazılır:
 * bakiye, ödemesi gereken mi yoksa lehine mi olduğu ve son 5 hareket. Ayrıntı için PDF ekstre gönderilir.
 */
export function statementText(input: StatementInput): string {
  const data = buildStatement(input);
  const day = (iso: string) => new Date(iso).toLocaleDateString(locale(), { day: "numeric", month: "long" });
  const title = (word: string) => {
    const lower = word.toLocaleLowerCase(locale());
    return lower.charAt(0).toLocaleUpperCase(locale()) + lower.slice(1);
  };
  const recent = transactionsOf(input.transactions, input.party.id).slice(-5);
  const balanceLine =
    data.balance > 0
      ? t("Güncel bakiye: {amount} (ödenecek)", { amount: money.format(data.balance) })
      : data.balance < 0
        ? t("Güncel bakiye: {amount} (lehinize)", { amount: money.format(-data.balance) })
        : t("Hesabınızda açık bakiye bulunmuyor.");
  const business = input.profile.name.trim();
  const lines = [
    t("Merhaba {name},", { name: input.party.name }),
    "",
    t("{date} itibarıyla cari hesap özetiniz:", { date: new Date().toLocaleDateString(locale(), { day: "numeric", month: "long", year: "numeric" }) }),
    "",
    balanceLine,
  ];
  if (recent.length > 0) {
    lines.push("", t("Son hareketler:"));
    for (const tx of recent) lines.push(`• ${day(tx.date)} · ${title(t(tx.type))} · ${money.format(tx.amount)}`);
  }
  lines.push("", t("Sorularınız için bize yazabilirsiniz."));
  if (business) lines.push(business);
  return lines.join("\n");
}

function wrap(ctx: CanvasRenderingContext2D, text: string, width: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width <= width) line = next;
    else {
      if (line) lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = kept[maxLines - 1].replace(/.{0,2}$/, "…");
    return kept;
  }
  return lines;
}

/**
 * Ekstreyi A4 sayfalar halinde çizer (canvas); bir sayfa = bir tuval.
 * Düzen: üstte logo + firma adı kartı, altında kişi adı, sonra TARİH / AÇIKLAMA / MİKTAR / TOPLAM tablosu.
 */
export async function renderStatement(input: StatementInput): Promise<HTMLCanvasElement[]> {
  const data = buildStatement(input);
  const { party, profile } = input;

  const miktarR = W - M - 200;
  const toplamR = W - M - 14;
  const col = { date: M + 14, type: M + 236, desc: M + 400 };
  const descW = miktarR - 190 - col.desc;

  const pages: HTMLCanvasElement[] = [];
  let y = 0;

  const create = () => {
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const context = canvas.getContext("2d")!;
    context.fillStyle = "#fff";
    context.fillRect(0, 0, W, H);
    context.textBaseline = "alphabetic";
    pages.push(canvas);
    return context;
  };
  let ctx = create();

  const text = (s: string, x: number, yy: number, size: number, color = INK, weight = "400", align: CanvasTextAlign = "left") => {
    ctx.font = `${weight} ${size}px ${FONT}`;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.fillText(s, x, yy);
  };

  const rule = (yy: number, thick: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(M, yy, W - 2 * M, thick);
  };

  const tableHeader = () => {
    const ty = y + 24;
    const up = (s: string) => s.toLocaleUpperCase(locale());
    text(up(t("Tarih")), col.date, ty, 18, INK, "600");
    text(up(t("Açıklama")), col.desc, ty, 18, INK, "600");
    text(up(t("Miktar")), miktarR, ty, 18, INK, "600", "right");
    text(up(t("Toplam")), toplamR, ty, 18, INK, "600", "right");
    y += 42;
    rule(y, 3, RULE);
    y += 4;
  };

  y = M;

  // Üst kart: logo + firma adı
  const cardH = 96;
  ctx.fillStyle = "#f7f9f8";
  ctx.strokeStyle = "#cfd8d3";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(M, y, W - 2 * M, cardH, 28);
  ctx.fill();
  ctx.stroke();
  // Yalnızca firma adı; logo ve baş harfler kullanılmaz
  text(profile.name || "Hesabım", M + 28, y + cardH / 2 + 11, 30, INK, "600");
  y += cardH + 28;

  // Kişi adı
  text(party.name.toLocaleUpperCase(locale()), M + 4, y + 28, 30, INK, "600");
  text(data.period, W - M - 4, y + 28, 19, MUTED, "400", "right");
  y += 52;

  tableHeader();

  if (data.rows.length === 0) {
    text(t("Henüz hareket yok."), col.date, y + 48, 19, MUTED);
    y += 90;
  }

  for (const r of data.rows) {
    ctx.font = `400 19px ${FONT}`;
    const desc = wrap(ctx, r.description, descW, 2);
    const rowH = Math.max(50, 22 + Math.max(desc.length, r.account ? 2 : 1) * 24);
    if (y + rowH > H - M - 220) {
      newPageFn();
      tableHeader();
    }
    const base = y + 32;
    const amount = r.debit ?? r.credit ?? 0;
    text(r.date, col.date, base, 19);
    text(r.type, col.type, base, 19, INK, r.carry ? "600" : "400");
    if (r.account) text(r.account, col.type, base + 22, 15, MUTED);
    desc.forEach((line, i) => text(line, col.desc, base + i * 24, 19));
    if (!r.carry) text(`${r.credit !== null ? "-" : ""}${plain(amount)}`, miktarR, base, 19, INK, "400", "right");
    text(plain(r.balance), toplamR, base, 19, r.balance < 0 ? "#c0392b" : INK, "400", "right");
    y += rowH;
    rule(y, 1, LINE);
    y += 1;
  }

  // Toplam satırı
  if (y + 110 > H - M - 40) {
    newPageFn();
  }
  rule(y + 2, 3, RULE);
  y += 5;
  const baseT = y + 44;
  text(`${t("TOPLAM")} ${currencyCode()}`, col.date, baseT, 19, INK, "600");
  text(`${plain(data.totalDebit)}${data.totalCredit ? `  -${plain(data.totalCredit)}` : ""}`, miktarR, baseT, 19, INK, "600", "right");
  text(plain(data.balance), toplamR, baseT + 1, 25, data.balance < 0 ? "#c0392b" : INK, "600", "right");
  y += 60;
  // Sayfa numarası yalnızca birden fazla sayfa varsa
  if (pages.length > 1) {
    pages.forEach((p, i) => {
      const c = p.getContext("2d")!;
      c.font = `400 19px ${FONT}`;
      c.fillStyle = MUTED;
      c.textAlign = "center";
      c.fillText(t("Sayfa {n} / {total}", { n: i + 1, total: pages.length }), W / 2, H - 50);
    });
  }
  return pages;

  function newPageFn() {
    ctx = create();
    y = M;
  }
}

const enc = new TextEncoder();

/** Sayfa görsellerinden (JPEG) basit bir PDF üretir. Her sayfa A4 boyutundadır. */
export function buildPdf(jpegs: Uint8Array[], pxW: number, pxH: number): Uint8Array {
  const PW = 595.28;
  const PH = 841.89;
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [];
  let length = 0;
  const push = (part: Uint8Array | string) => {
    const bytes = typeof part === "string" ? enc.encode(part) : part;
    chunks.push(bytes);
    length += bytes.length;
  };
  const obj = (n: number, body: string | (() => void)) => {
    offsets[n] = length;
    push(`${n} 0 obj\n`);
    if (typeof body === "string") push(body);
    else body();
    push("\nendobj\n");
  };

  push("%PDF-1.4\n");
  const n = jpegs.length;
  // 1: katalog, 2: sayfalar, sonra her sayfa için 3 nesne (sayfa, içerik, görsel)
  obj(1, "<< /Type /Catalog /Pages 2 0 R >>");
  const kids = jpegs.map((_, i) => `${3 + i * 3} 0 R`).join(" ");
  obj(2, `<< /Type /Pages /Kids [${kids}] /Count ${n} >>`);
  jpegs.forEach((jpeg, i) => {
    const page = 3 + i * 3;
    obj(page, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PW} ${PH}] /Resources << /XObject << /Im0 ${page + 2} 0 R >> >> /Contents ${page + 1} 0 R >>`);
    const content = `q ${PW} 0 0 ${PH} 0 0 cm /Im0 Do Q`;
    obj(page + 1, `<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
    obj(page + 2, () => {
      push(`<< /Type /XObject /Subtype /Image /Width ${pxW} /Height ${pxH} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`);
      push(jpeg);
      push("\nendstream");
    });
  });

  const count = 3 + n * 3;
  const xref = length;
  push(`xref\n0 ${count}\n0000000000 65535 f \n`);
  for (let i = 1; i < count; i++) push(`${String(offsets[i]).padStart(10, "0")} 00000 n \n`);
  push(`trailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);

  const out = new Uint8Array(length);
  let pos = 0;
  for (const c of chunks) {
    out.set(c, pos);
    pos += c.length;
  }
  return out;
}

const dataUrlToBytes = (url: string): Uint8Array => {
  const bin = atob(url.slice(url.indexOf(",") + 1));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};

export interface StatementPdf {
  blob: Blob;
  /** Önizleme için sayfa görselleri (veri adresi) */
  previews: string[];
  filename: string;
}

export async function createStatementPdf(input: StatementInput): Promise<StatementPdf> {
  const pages = await renderStatement(input);
  const jpegs = pages.map((p) => dataUrlToBytes(p.toDataURL("image/jpeg", 0.92)));
  const bytes = buildPdf(jpegs, W, H);
  const safe = input.party.name.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "");
  return {
    blob: new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" }),
    previews: pages.map((p) => p.toDataURL("image/jpeg", 0.7)),
    filename: `${t("Ekstre")}-${safe || "hesap"}.pdf`,
  };
}
