import { db } from "@/lib/db";
import { assessPaymentRisk } from "@/lib/rules/paymentDeadline";
import { rankBillsByRisk } from "@/lib/rules/prioritize";
import {
  DEFAULT_PAYMENT_RULE_CONFIG,
  type Bill,
  type PaymentRiskAssessment,
  type UdyamCategory,
  type Vendor,
} from "@/lib/rules/types";

export type RankedRisk = PaymentRiskAssessment & {
  vendorName: string;
  amount: number;
};

export interface DashboardData {
  asOf: string;
  ranked: RankedRisk[];
  moneyAlreadyAtRisk: number;
  billsNeedingActionThisWeek: number;
  totalBills: number;
  totalVendors: number;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Reads vendors + bills from the DB and runs the deterministic rule engine over them. */
export async function getDashboardData(ownerId: string): Promise<DashboardData> {
  const [vendorRows, billRows] = await Promise.all([
    db.vendor.findMany({ where: { ownerId } }),
    db.bill.findMany({ where: { ownerId } }),
  ]);

  const vendorsById = new Map(vendorRows.map((v) => [v.id, v]));
  const asOf = todayIso();

  const risks: RankedRisk[] = [];
  for (const row of billRows) {
    const vendorRow = vendorsById.get(row.vendorId);
    if (!vendorRow) continue;

    const vendor: Vendor = {
      id: vendorRow.id,
      name: vendorRow.name,
      gstin: vendorRow.gstin,
      gstinActive: vendorRow.gstinActive,
      udyamRegistered: vendorRow.udyamRegistered,
      udyamCategory: (vendorRow.udyamCategory as UdyamCategory | null) ?? null,
    };
    const bill: Bill = {
      id: row.id,
      vendorId: row.vendorId,
      invoiceAcceptanceDate: row.invoiceAcceptanceDate,
      amount: row.amount,
      hasWrittenAgreement: row.hasWrittenAgreement,
      agreedPaymentDays: row.agreedPaymentDays,
      paidDate: row.paidDate,
    };

    const assessment = assessPaymentRisk(
      vendor,
      bill,
      asOf,
      DEFAULT_PAYMENT_RULE_CONFIG
    );
    risks.push({ ...assessment, vendorName: vendor.name, amount: bill.amount });
  }

  const ranked = rankBillsByRisk(risks) as RankedRisk[];

  const moneyAlreadyAtRisk = ranked
    .filter((r) => r.status === "breached" || r.status === "paid-late")
    .reduce((sum, r) => sum + r.totalCostOfDelay, 0);

  const billsNeedingActionThisWeek = ranked.filter(
    (r) => r.status === "due-soon"
  ).length;

  return {
    asOf,
    ranked,
    moneyAlreadyAtRisk,
    billsNeedingActionThisWeek,
    totalBills: billRows.length,
    totalVendors: vendorRows.length,
  };
}
