// Fees: internal invoice/receipt/refund number generator (not part of the public API).
import { Prisma } from "@/generated/prisma/client";

// ============================================================================
// Sequence Generator for Invoices, Receipts, and Refunds
// ============================================================================

export async function generateNextSequenceNumber(
  tx: Prisma.TransactionClient,
  schoolId: string,
  prefix: "INV" | "REC" | "REF"
): Promise<string> {
  const currentYear = new Date().getFullYear();
  let count = 0;

  if (prefix === "INV") {
    count = await tx.invoice.count({ where: { schoolId } });
  } else if (prefix === "REC") {
    count = await tx.payment.count({ where: { schoolId } });
  } else if (prefix === "REF") {
    count = await tx.refund.count({ where: { schoolId } });
  }

  const seq = (count + 1).toString().padStart(5, "0");
  return `${prefix}-${currentYear}-${seq}`;
}
