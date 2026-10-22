import type { Account, Customer, Profile, Transaction } from "../data/mock";
import { signOf, transactionsOf } from "../data/mock";
import { money } from "./format";
import { locale, t } from "./i18n";

/** A4, 150 dpi */
const W = 1240;
const H = 1754;
const M = 80;
const FONT = '-apple-system, "Segoe UI", Helvetica, Arial, sans-serif';

const INK = "#1b2430";
const MUTED = "#6b7683";
const LINE = "#d9dee5";
const HEAD = "#1e3a5f";

export interface StatementInput {
  party: Customer;
  profile: Profile;
  accounts: Account[];
  transactions: Transaction[];
}

export interface StatementRow {
  date: string;
  type: string;
  account: string;
  description: string;
  debit: number | null;
  credit: number | null;
  balance: number;
}

export interface StatementData {
  rows: StatementRow[];
  totalDebit: number;
  totalCredit: number;
  balance: number;
}

const dateText = (iso: string) =>
  new Date(iso).toLocaleDateString(locale(), { day: "2-digit", month: "2-digit", year: "numeric" });

/** Hareketleri tarih sırasıyla, yürüyen bakiyeyle hesaplar. Borç: satış ve ödeme (+), alacak: tahsilat ve alış (−). */
export function buildStatement({ party, accounts, transactions }: StatementInput): StatementData {
  let balance = 0;
  let totalDebit = 0;
  let totalCredit = 0;
  const rows = transactionsOf(transactions, party.id).map((tx) => {
    const sign = signOf(tx.type);
    balance += sign * tx.amount;
    if (sign > 0) totalDebit += tx.amount;
    else totalCredit += tx.amount;
    return {
      date: dateText(tx.date),
      type: t(tx.type),
      account: tx.account ? t(accounts.find((a) => a.id === tx.account)?.name ?? "") : "",
      description: tx.description,
      debit: sign > 0 ? tx.amount : null,
      credit: sign < 0 ? tx.amount : null,
      balance,
    };
  });
  return { rows, totalDebit, totalCredit, balance };
}

/** "Alacağınız: ₺1.000,00" / "Borcunuz: ₺500,00" */
export function balanceText(balance: number): string {
  if (balance > 0) return t("Alacağınız: {amount}", { amount: money.format(balance) });
  if (balance < 0) return t("Borcunuz: {amount}", { amount: money.format(-balance) });
  return t("Bakiye: {amount}", { amount: money.format(0) });
}

/** Paylaşılacak düz metin özeti (son 25 hareket) */
export function statementText(input: StatementInput): string {
  const data = buildStatement(input);
  const lines = [
    `${t("Cari hesap ekstresi")} — ${input.party.name}`,
    input.profile.name,
    `${t("Düzenlenme tarihi: {date}", { date: dateText(new Date().toISOString()) })}`,
    "",
    ...data.rows.slice(-25).map((r) => {
      const amount = r.debit ?? r.credit ?? 0;
      const sign = r.credit !== null ? "-" : "";
      return `${r.date} · ${r.type}${r.description ? ` · ${r.description}` : ""} · ${sign}${money.format(amount)}`;
    }),
    "",
    `${t("Toplam borç")}: ${money.format(data.totalDebit)}`,
    `${t("Toplam alacak")}: ${money.format(data.totalCredit)}`,
    balanceText(data.balance),
  ];
  return lines.join("\n");
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
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

/** Ekstreyi A4 sayfalar halinde çizer (canvas); bir sayfa = bir tuval */
export async function renderStatement(input: StatementInput): Promise<HTMLCanvasElement[]> {
  const data = buildStatement(input);
  const { party, profile } = input;
  const logo = profile.logo ? await loadImage(profile.logo) : null;

  // Sütunlar (x konumu ve genişlik)
  const col = {
    date: { x: M, w: 130 },
    type: { x: M + 148, w: 120 },
    desc: { x: M + 280, w: 215 },
    debit: { x: M + 500, w: 165 },
    credit: { x: M + 685, w: 165 },
  };
  const right = (c: { x: number; w: number }) => c.x + c.w;

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
  const newPage = () => {
    ctx = create();
    y = M;
  };

  const text = (s: string, x: number, yy: number, size: number, color = INK, weight = "400", align: CanvasTextAlign = "left") => {
    ctx.font = `${weight} ${size}px ${FONT}`;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.fillText(s, x, yy);
  };

  const tableHeader = () => {
    ctx.fillStyle = HEAD;
    ctx.fillRect(M, y, W - 2 * M, 54);
    const ty = y + 35;
    text(t("Tarih"), col.date.x + 8, ty, 22, "#fff", "600");
    text(t("Tür"), col.type.x, ty, 22, "#fff", "600");
    text(t("Açıklama"), col.desc.x, ty, 22, "#fff", "600");
    text(t("Borç"), right(col.debit), ty, 22, "#fff", "600", "right");
    text(t("Alacak"), right(col.credit), ty, 22, "#fff", "600", "right");
    text(t("Bakiye"), W - M - 12, ty, 22, "#fff", "600", "right");
    y += 54;
  };

  y = M;

  // Üst bilgi: logo + firma
  let hx = M;
  if (logo) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(M + 45, y + 45, 45, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(logo, M, y, 90, 90);
    ctx.restore();
    hx = M + 112;
  }
  text(profile.name || "Hesabım", hx, y + 40, 38, INK, "700");
  const contact = [profile.phone, profile.email].filter(Boolean).join("  ·  ");
  if (contact) text(contact, hx, y + 72, 22, MUTED);
  if (profile.address) text(profile.address, hx, y + 100, 22, MUTED);
  if (profile.taxNo) text(`${t("Vergi numarası")}: ${profile.taxNo}`, hx, y + 128, 22, MUTED);
  y += 160;

  ctx.fillStyle = HEAD;
  ctx.fillRect(M, y, W - 2 * M, 4);
  y += 50;
  text(t("CARİ HESAP EKSTRESİ"), M, y, 34, HEAD, "700");
  text(t("Düzenlenme tarihi: {date}", { date: dateText(new Date().toISOString()) }), W - M, y, 22, MUTED, "400", "right");
  y += 36;

  // Müşteri kutusu
  const info = [
    party.phone && `${t("Telefon")}: ${party.phone}`,
    party.email && `${t("E-posta")}: ${party.email}`,
    party.address && `${t("Adres")}: ${party.address}`,
  ].filter(Boolean) as string[];
  const boxH = 70 + info.length * 32;
  ctx.fillStyle = "#f3f6f9";
  ctx.fillRect(M, y, W - 2 * M, boxH);
  text(party.name, M + 24, y + 44, 30, INK, "700");
  info.forEach((line, i) => text(line, M + 24, y + 80 + i * 32, 22, MUTED));
  y += boxH + 40;

  tableHeader();

  const rowFont = 22;
  if (data.rows.length === 0) {
    text(t("Henüz hareket yok."), M + 12, y + 50, 24, MUTED);
    y += 90;
  }

  for (const r of data.rows) {
    ctx.font = `400 ${rowFont}px ${FONT}`;
    const desc = wrap(ctx, r.description, col.desc.w, 2);
    const rowH = Math.max(60, 26 + Math.max(desc.length, r.account ? 2 : 1) * 28);
    if (y + rowH > H - M - 40) {
      newPage();
      tableHeader();
    }
    const base = y + 38;
    text(r.date, col.date.x + 8, base, rowFont);
    text(r.type, col.type.x, base, rowFont, INK, "600");
    if (r.account) text(r.account, col.type.x, base + 28, 19, MUTED);
    desc.forEach((line, i) => text(line, col.desc.x, base + i * 28, rowFont));
    if (r.debit !== null) text(money.format(r.debit), right(col.debit), base, rowFont, INK, "400", "right");
    if (r.credit !== null) text(money.format(r.credit), right(col.credit), base, rowFont, INK, "400", "right");
    text(money.format(r.balance), W - M - 12, base, rowFont, r.balance < 0 ? "#c0392b" : INK, "600", "right");
    y += rowH;
    ctx.fillStyle = LINE;
    ctx.fillRect(M, y, W - 2 * M, 1);
  }

  // Toplamlar
  if (y + 190 > H - M - 40) newPage();
  y += 40;
  const label = (s: string, v: string, color = INK, bold = false) => {
    text(s, W - M - 360, y, 24, MUTED);
    text(v, W - M - 12, y, bold ? 30 : 24, color, bold ? "700" : "400", "right");
    y += bold ? 52 : 40;
  };
  label(t("Toplam borç"), money.format(data.totalDebit));
  label(t("Toplam alacak"), money.format(data.totalCredit));
  ctx.fillStyle = LINE;
  ctx.fillRect(W - M - 360, y - 22, 360, 2);
  y += 12;
  text(balanceText(data.balance), W - M - 12, y, 30, data.balance < 0 ? "#c0392b" : HEAD, "700", "right");
  pages.forEach((p, i) => {
    const c = p.getContext("2d")!;
    c.font = `400 19px ${FONT}`;
    c.fillStyle = MUTED;
    c.textAlign = "center";
    c.fillText(t("Sayfa {n} / {total}", { n: i + 1, total: pages.length }), W / 2, H - 50);
  });
  return pages;
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
