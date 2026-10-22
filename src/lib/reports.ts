import {
  balanceOf,
  totalsBetween,
  type Customer,
  type Totals,
  type Transaction,
} from "../data/mock";
import { money } from "./format";
import { t } from "./i18n";

export type ReportPeriod = "month" | "lastMonth" | "year" | "all";

/** Etiketler dile göre çizim anında çevrilir */
export const reportPeriods = (): { value: ReportPeriod; label: string }[] => [
  { value: "month", label: t("Bu ay") },
  { value: "lastMonth", label: t("Geçen ay") },
  { value: "year", label: t("Bu yıl") },
  { value: "all", label: t("Tümü") },
];

/** Raporun tarih aralığı: başlangıç (dahil) ve bitiş (hariç) */
export function reportRange(
  period: ReportPeriod,
  now = new Date(),
): [Date, Date] {
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (period) {
    case "month":
      return [new Date(y, m, 1), new Date(y, m + 1, 1)];
    case "lastMonth":
      return [new Date(y, m - 1, 1), new Date(y, m, 1)];
    case "year":
      return [new Date(y, 0, 1), new Date(y + 1, 0, 1)];
    case "all":
      return [new Date(1970, 0, 1), new Date(y + 100, 0, 1)];
  }
}

export interface RankedParty {
  id: string;
  name: string;
  amount: number;
}

export interface Report {
  totals: Totals;
  /** En çok satış yapılan müşteriler */
  topCustomers: RankedParty[];
  /** En çok alış yapılan tedarikçi ve diğer kayıtlar */
  topSuppliers: RankedParty[];
  /** Tüm pozitif bakiyelerin toplamı */
  receivable: number;
  /** Tüm negatif bakiyelerin mutlak toplamı */
  payable: number;
}

/** Seçilen dönemin raporu: toplamlar, en çok işlem yapılanlar, alacak ve borç özeti */
export function buildReport(
  parties: Customer[],
  transactions: Transaction[],
  period: ReportPeriod,
): Report {
  const range = reportRange(period);
  const totals = totalsBetween(transactions, range);
  const inRange = transactions.filter((t) => {
    const at = new Date(t.date);
    return at >= range[0] && at < range[1];
  });

  const rank = (kindFilter: (p: Customer) => boolean, type: "SATIŞ" | "ALIŞ") =>
    parties
      .filter(kindFilter)
      .map((p) => ({
        id: p.id,
        name: p.name,
        amount: inRange
          .filter((t) => t.customerId === p.id && t.type === type)
          .reduce((sum, t) => sum + t.amount, 0),
      }))
      .filter((r) => r.amount > 0)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

  const balances = parties.map((p) => balanceOf(transactions, p.id));
  return {
    totals,
    topCustomers: rank((p) => p.kind === "customer", "SATIŞ"),
    topSuppliers: rank((p) => p.kind !== "customer", "ALIŞ"),
    receivable: balances.filter((b) => b > 0).reduce((s, b) => s + b, 0),
    payable: balances.filter((b) => b < 0).reduce((s, b) => s - b, 0),
  };
}

/** Panoya kopyalanacak düz metin rapor */
export function reportText(
  title: string,
  periodLabel: string,
  report: Report,
): string {
  const lines = [
    t("{title} — {period} raporu", { title, period: periodLabel }),
    "",
    `${t("Gelir (satış)")}: ${money.format(report.totals.satis)}`,
    `${t("Gider (alış)")}: ${money.format(report.totals.alis)}`,
    `${t("Net")}: ${money.format(report.totals.satis - report.totals.alis)}`,
    `${t("Tahsilat")}: ${money.format(report.totals.tahsilat)}`,
    "",
    `${t("Toplam alacak")}: ${money.format(report.receivable)}`,
    `${t("Toplam borç")}: ${money.format(report.payable)}`,
  ];
  if (report.topCustomers.length) {
    lines.push("", `${t("En çok satış yapılanlar")}:`);
    report.topCustomers.forEach((r, i) => lines.push(`${i + 1}. ${r.name}: ${money.format(r.amount)}`));
  }
  if (report.topSuppliers.length) {
    lines.push("", `${t("En çok alış yapılanlar")}:`);
    report.topSuppliers.forEach((r, i) => lines.push(`${i + 1}. ${r.name}: ${money.format(r.amount)}`));
  }
  return lines.join("\n");
}
