// Fees: payment collection and reversal, concessions/adjustments and refunds.
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { InvoiceStatus } from "@/generated/prisma/enums";
import {
  AuthenticatedUser,
  assertCanCollectSchoolFees,
  assertCanApproveFeeAdjustments,
} from "@/modules/auth";
import { BadRequestError, NotFoundError } from "@/lib/errors";
import { logAuditEvent } from "@/lib/audit";
import {
  CollectPaymentInput,
  FeeAdjustmentInput,
  RefundInput,
  formatMoney,
  toDecimal,
} from "./fees-common";
import { generateNextSequenceNumber } from "./fee-sequence";

// ============================================================================
// Payment Collection and Receipts
// ============================================================================

export async function collectPayment(
  schoolId: string,
  user: AuthenticatedUser,
  input: CollectPaymentInput
) {
  assertCanCollectSchoolFees(user, schoolId);

  const amount = toDecimal(input.amount);
  if (!amount.greaterThan(0)) {
    throw new BadRequestError("Payment amount must be greater than zero");
  }

  const paymentDate = input.paymentDate ? new Date(input.paymentDate) : new Date();

  return prisma.$transaction(async (tx) => {
    // Pessimistic concurrency control: lock the invoice row
    const lockedInvoices = await tx.$queryRaw<
      Array<{
        id: string;
        schoolId: string;
        invoiceNumber: string;
        studentId: string;
        status: InvoiceStatus;
        grossAmount: string;
        concessionAmount: string;
        netAmount: string;
        paidAmount: string;
        refundedAmount: string;
      }>
    >`
      SELECT id, "schoolId", "invoiceNumber", "studentId", status, 
             "grossAmount", "concessionAmount", "netAmount", "paidAmount", "refundedAmount"
      FROM invoices
      WHERE id = ${input.invoiceId} AND "schoolId" = ${schoolId}
      FOR UPDATE
    `;

    if (!lockedInvoices || lockedInvoices.length === 0) {
      throw new NotFoundError("Invoice not found in this school");
    }

    const locked = lockedInvoices[0];

    if (locked.status === "CANCELLED") {
      throw new BadRequestError("Cannot record payment against a cancelled invoice");
    }

    const netAmount = new Prisma.Decimal(locked.netAmount);
    const paidAmount = new Prisma.Decimal(locked.paidAmount);
    const refundedAmount = new Prisma.Decimal(locked.refundedAmount);

    const outstandingBalance = netAmount.minus(paidAmount).plus(refundedAmount);

    if (amount.greaterThan(outstandingBalance)) {
      throw new BadRequestError(
        `Payment amount (${formatMoney(amount)}) exceeds outstanding balance (${formatMoney(outstandingBalance)})`
      );
    }

    const receiptNumber = await generateNextSequenceNumber(tx, schoolId, "REC");

    const payment = await tx.payment.create({
      data: {
        schoolId,
        invoiceId: input.invoiceId,
        receiptNumber,
        amount,
        paymentMethod: input.paymentMethod,
        paymentDate,
        status: "COMPLETED",
        transactionReference: input.transactionReference?.trim() || null,
        remarks: input.remarks?.trim() || null,
        recordedById: user.id,
      },
      include: {
        recordedBy: { select: { id: true, name: true, role: true } },
      },
    });

    const newPaidAmount = paidAmount.plus(amount);
    const newOutstanding = netAmount.minus(newPaidAmount).plus(refundedAmount);

    let newStatus: InvoiceStatus = locked.status;
    if (newOutstanding.isZero() || newOutstanding.isNegative()) {
      newStatus = "PAID";
    } else {
      newStatus = "PARTIALLY_PAID";
    }

    await tx.invoice.update({
      where: { id: input.invoiceId },
      data: {
        paidAmount: newPaidAmount,
        status: newStatus,
      },
    });

    // Fetch full receipt details
    const fullInvoice = await tx.invoice.findUnique({
      where: { id: input.invoiceId },
      include: {
        school: { select: { id: true, name: true, code: true } },
        student: { select: { id: true, name: true, admissionNumber: true } },
        enrollment: {
          include: {
            section: { include: { class: true } },
          },
        },
      },
    });

    await logAuditEvent({
      action: "PAYMENT_COLLECTED",
      entityType: "Payment",
      entityId: payment.id,
      schoolId,
      userId: user.id,
      details: {
        receiptNumber: payment.receiptNumber,
        invoiceNumber: locked.invoiceNumber,
        amount: payment.amount.toString(),
        paymentMethod: payment.paymentMethod,
        newOutstanding: newOutstanding.toString(),
      },
    });

    return {
      payment,
      receipt: {
        receiptNumber: payment.receiptNumber,
        paymentDate: payment.paymentDate,
        amountReceived: payment.amount,
        paymentMethod: payment.paymentMethod,
        transactionReference: payment.transactionReference,
        remarks: payment.remarks,
        invoiceNumber: fullInvoice?.invoiceNumber,
        invoiceTitle: fullInvoice?.title,
        schoolName: fullInvoice?.school.name,
        studentName: fullInvoice?.student.name,
        admissionNumber: fullInvoice?.student.admissionNumber,
        className: fullInvoice?.enrollment?.section?.class?.name,
        sectionName: fullInvoice?.enrollment?.section?.name,
        invoicedAmount: fullInvoice?.netAmount,
        totalPaid: newPaidAmount,
        remainingBalance: newOutstanding.isNegative() ? new Prisma.Decimal(0) : newOutstanding,
        recordedByName: user.name,
      },
    };
  });
}

export async function reversePayment(
  schoolId: string,
  user: AuthenticatedUser,
  paymentId: string,
  params: { reason: string }
) {
  assertCanApproveFeeAdjustments(user, schoolId);

  const trimmedReason = params.reason?.trim();
  if (!trimmedReason) {
    throw new BadRequestError("A mandatory reversal reason is required");
  }

  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findFirst({
      where: { id: paymentId, schoolId },
      include: { refunds: true },
    });

    if (!payment) {
      throw new NotFoundError("Payment record not found");
    }

    if (payment.isReversed) {
      throw new BadRequestError("Payment is already reversed");
    }

    if (payment.refunds && payment.refunds.length > 0) {
      throw new BadRequestError("Cannot reverse a payment that has associated refunds");
    }

    // Lock invoice row
    const lockedInvoices = await tx.$queryRaw<
      Array<{
        id: string;
        netAmount: string;
        paidAmount: string;
        refundedAmount: string;
        dueDate: Date;
        status: InvoiceStatus;
      }>
    >`
      SELECT id, "netAmount", "paidAmount", "refundedAmount", "dueDate", status
      FROM invoices
      WHERE id = ${payment.invoiceId} AND "schoolId" = ${schoolId}
      FOR UPDATE
    `;

    if (!lockedInvoices || lockedInvoices.length === 0) {
      throw new NotFoundError("Associated invoice not found");
    }

    const locked = lockedInvoices[0];
    const currentPaid = new Prisma.Decimal(locked.paidAmount);

    const newPaidAmount = currentPaid.minus(payment.amount);

    let newStatus: InvoiceStatus = "ISSUED";
    if (newPaidAmount.greaterThan(0)) {
      newStatus = "PARTIALLY_PAID";
    } else {
      newStatus = new Date(locked.dueDate) < new Date() ? "OVERDUE" : "ISSUED";
    }

    const updatedPayment = await tx.payment.update({
      where: { id: paymentId },
      data: {
        isReversed: true,
        reversalReason: trimmedReason,
        reversedAt: new Date(),
        reversedById: user.id,
        status: "REVERSED",
      },
    });

    await tx.invoice.update({
      where: { id: payment.invoiceId },
      data: {
        paidAmount: newPaidAmount.isNegative() ? new Prisma.Decimal(0) : newPaidAmount,
        status: newStatus,
      },
    });

    await logAuditEvent({
      action: "PAYMENT_REVERSED",
      entityType: "Payment",
      entityId: paymentId,
      schoolId,
      userId: user.id,
      details: {
        receiptNumber: payment.receiptNumber,
        amount: payment.amount.toString(),
        reason: trimmedReason,
        newPaidAmount: newPaidAmount.toString(),
      },
    });

    return updatedPayment;
  });
}

// ============================================================================
// Concessions and Adjustments
// ============================================================================

export async function applyFeeAdjustment(
  schoolId: string,
  user: AuthenticatedUser,
  invoiceId: string,
  input: FeeAdjustmentInput
) {
  assertCanApproveFeeAdjustments(user, schoolId);

  const amount = toDecimal(input.amount);
  if (!amount.greaterThan(0)) {
    throw new BadRequestError("Adjustment amount must be greater than zero");
  }

  const trimmedReason = input.reason?.trim();
  if (!trimmedReason) {
    throw new BadRequestError("A mandatory concession/adjustment reason is required");
  }

  return prisma.$transaction(async (tx) => {
    const lockedInvoices = await tx.$queryRaw<
      Array<{
        id: string;
        invoiceNumber: string;
        grossAmount: string;
        concessionAmount: string;
        netAmount: string;
        paidAmount: string;
        refundedAmount: string;
        status: InvoiceStatus;
      }>
    >`
      SELECT id, "invoiceNumber", "grossAmount", "concessionAmount", "netAmount", "paidAmount", "refundedAmount", status
      FROM invoices
      WHERE id = ${invoiceId} AND "schoolId" = ${schoolId}
      FOR UPDATE
    `;

    if (!lockedInvoices || lockedInvoices.length === 0) {
      throw new NotFoundError("Invoice not found in this school");
    }

    const inv = lockedInvoices[0];
    if (inv.status === "CANCELLED") {
      throw new BadRequestError("Cannot apply adjustments to a cancelled invoice");
    }

    const grossAmount = new Prisma.Decimal(inv.grossAmount);
    const existingConcession = new Prisma.Decimal(inv.concessionAmount);
    const paidAmount = new Prisma.Decimal(inv.paidAmount);
    const refundedAmount = new Prisma.Decimal(inv.refundedAmount);

    const newConcession = existingConcession.plus(amount);

    if (newConcession.greaterThan(grossAmount)) {
      throw new BadRequestError(
        `Total concessions (${formatMoney(newConcession)}) cannot exceed gross invoice amount (${formatMoney(grossAmount)})`
      );
    }

    const newNetAmount = grossAmount.minus(newConcession);

    // Prevent reducing net payable below already collected amount (must refund instead)
    if (newNetAmount.lessThan(paidAmount.minus(refundedAmount))) {
      throw new BadRequestError(
        `Adjusted net payable (${formatMoney(newNetAmount)}) cannot be less than already collected payments (${formatMoney(paidAmount.minus(refundedAmount))}). Issue a refund instead.`
      );
    }

    const adjustment = await tx.feeAdjustment.create({
      data: {
        schoolId,
        invoiceId,
        type: input.type || "CONCESSION",
        amount,
        reason: trimmedReason,
        approvedById: user.id,
      },
      include: {
        approvedBy: { select: { id: true, name: true } },
      },
    });

    const outstanding = newNetAmount.minus(paidAmount).plus(refundedAmount);
    let newStatus: InvoiceStatus = inv.status;
    if (outstanding.isZero()) {
      newStatus = "PAID";
    } else if (paidAmount.greaterThan(0)) {
      newStatus = "PARTIALLY_PAID";
    }

    await tx.invoice.update({
      where: { id: invoiceId },
      data: {
        concessionAmount: newConcession,
        netAmount: newNetAmount,
        status: newStatus,
      },
    });

    await logAuditEvent({
      action: "FEE_ADJUSTMENT_APPLIED",
      entityType: "FeeAdjustment",
      entityId: adjustment.id,
      schoolId,
      userId: user.id,
      details: {
        invoiceNumber: inv.invoiceNumber,
        type: adjustment.type,
        amount: adjustment.amount.toString(),
        reason: trimmedReason,
        newNetAmount: newNetAmount.toString(),
      },
    });

    return adjustment;
  });
}

// ============================================================================
// Refunds
// ============================================================================

export async function processRefund(
  schoolId: string,
  user: AuthenticatedUser,
  invoiceId: string,
  input: RefundInput
) {
  assertCanApproveFeeAdjustments(user, schoolId);

  const amount = toDecimal(input.amount);
  if (!amount.greaterThan(0)) {
    throw new BadRequestError("Refund amount must be greater than zero");
  }

  const trimmedReason = input.reason?.trim();
  if (!trimmedReason) {
    throw new BadRequestError("A mandatory refund reason is required");
  }

  return prisma.$transaction(async (tx) => {
    const lockedInvoices = await tx.$queryRaw<
      Array<{
        id: string;
        invoiceNumber: string;
        grossAmount: string;
        netAmount: string;
        paidAmount: string;
        refundedAmount: string;
        status: InvoiceStatus;
      }>
    >`
      SELECT id, "invoiceNumber", "grossAmount", "netAmount", "paidAmount", "refundedAmount", status
      FROM invoices
      WHERE id = ${invoiceId} AND "schoolId" = ${schoolId}
      FOR UPDATE
    `;

    if (!lockedInvoices || lockedInvoices.length === 0) {
      throw new NotFoundError("Invoice not found in this school");
    }

    const inv = lockedInvoices[0];
    const paidAmount = new Prisma.Decimal(inv.paidAmount);
    const existingRefunded = new Prisma.Decimal(inv.refundedAmount);
    const netAmount = new Prisma.Decimal(inv.netAmount);

    const maxRefundable = paidAmount.minus(existingRefunded);

    if (amount.greaterThan(maxRefundable)) {
      throw new BadRequestError(
        `Refund amount (${formatMoney(amount)}) exceeds refundable balance (${formatMoney(maxRefundable)})`
      );
    }

    // If specific payment specified, verify it
    if (input.paymentId) {
      const pmt = await tx.payment.findFirst({
        where: { id: input.paymentId, invoiceId, schoolId, isReversed: false },
      });
      if (!pmt) {
        throw new BadRequestError("Specified payment does not exist or is reversed");
      }
    }

    const refundNumber = await generateNextSequenceNumber(tx, schoolId, "REF");

    const refund = await tx.refund.create({
      data: {
        schoolId,
        invoiceId,
        paymentId: input.paymentId || null,
        refundNumber,
        amount,
        reason: trimmedReason,
        reference: input.reference?.trim() || null,
        refundMethod: input.refundMethod || "CASH",
        approvedById: user.id,
      },
      include: {
        approvedBy: { select: { id: true, name: true } },
      },
    });

    const newRefundedAmount = existingRefunded.plus(amount);

    let newStatus: InvoiceStatus = inv.status;
    if (newRefundedAmount.equals(paidAmount) && netAmount.greaterThan(0)) {
      newStatus = "REFUNDED";
    }

    await tx.invoice.update({
      where: { id: invoiceId },
      data: {
        refundedAmount: newRefundedAmount,
        status: newStatus,
      },
    });

    await logAuditEvent({
      action: "REFUND_PROCESSED",
      entityType: "Refund",
      entityId: refund.id,
      schoolId,
      userId: user.id,
      details: {
        refundNumber: refund.refundNumber,
        invoiceNumber: inv.invoiceNumber,
        amount: refund.amount.toString(),
        reason: trimmedReason,
      },
    });

    return refund;
  });
}
