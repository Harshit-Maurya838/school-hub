// Fees: financial overview, dashboards and collection reports.
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { PaymentMethod } from "@/generated/prisma/enums";
import { AuthenticatedUser, assertCanViewSchoolFees } from "@/modules/auth";
import { NotFoundError } from "@/lib/errors";
import { toDecimal } from "./fees-common";

// ============================================================================
// Reports and Financial Intelligence
// ============================================================================

export async function getFinancialOverview(
  schoolId: string,
  user: AuthenticatedUser,
  filters?: {
    academicYearId?: string;
    startDate?: string | Date;
    endDate?: string | Date;
  }
) {
  assertCanViewSchoolFees(user, schoolId);

  const dateFilter: Prisma.DateTimeFilter | undefined =
    filters?.startDate || filters?.endDate
      ? {
          gte: filters?.startDate ? new Date(filters.startDate) : undefined,
          lte: filters?.endDate ? new Date(filters.endDate) : undefined,
        }
      : undefined;

  const [invoices, payments, refunds, adjustments] = await Promise.all([
    prisma.invoice.findMany({
      where: {
        schoolId,
        academicYearId: filters?.academicYearId,
        createdAt: dateFilter,
        status: { not: "CANCELLED" },
      },
      select: {
        grossAmount: true,
        concessionAmount: true,
        netAmount: true,
        paidAmount: true,
        refundedAmount: true,
        status: true,
        dueDate: true,
      },
    }),
    prisma.payment.findMany({
      where: {
        schoolId,
        paymentDate: dateFilter,
        isReversed: false,
      },
      select: { amount: true, paymentMethod: true, paymentDate: true },
    }),
    prisma.refund.findMany({
      where: {
        schoolId,
        createdAt: dateFilter,
      },
      select: { amount: true, refundMethod: true, createdAt: true },
    }),
    prisma.feeAdjustment.findMany({
      where: {
        schoolId,
        createdAt: dateFilter,
      },
      select: { amount: true, type: true },
    }),
  ]);

  const invoicedGross = invoices.reduce(
    (sum, inv) => sum.plus(inv.grossAmount),
    new Prisma.Decimal(0)
  );

  const concessions = invoices.reduce(
    (sum, inv) => sum.plus(inv.concessionAmount),
    new Prisma.Decimal(0)
  );

  const invoicedNet = invoices.reduce((sum, inv) => sum.plus(inv.netAmount), new Prisma.Decimal(0));

  const amountCollected = payments.reduce((sum, p) => sum.plus(p.amount), new Prisma.Decimal(0));

  const totalRefunds = refunds.reduce((sum, r) => sum.plus(r.amount), new Prisma.Decimal(0));

  const netCollections = amountCollected.minus(totalRefunds);

  const outstandingAmount = invoicedNet.minus(amountCollected).plus(totalRefunds);

  // Status breakdown
  const now = new Date();
  let paidCount = 0;
  let partiallyPaidCount = 0;
  let overdueCount = 0;
  let issuedCount = 0;

  for (const inv of invoices) {
    if (inv.status === "PAID") paidCount++;
    else if (inv.status === "PARTIALLY_PAID") partiallyPaidCount++;
    else if (inv.dueDate < now) overdueCount++;
    else issuedCount++;
  }

  // Payment method breakdown
  const paymentMethods: Record<string, string> = {};
  for (const p of payments) {
    const key = p.paymentMethod;
    const current = new Prisma.Decimal(paymentMethods[key] || 0);
    paymentMethods[key] = current.plus(p.amount).toString();
  }

  const totalAdjustments = adjustments.reduce(
    (sum, a) => sum.plus(a.amount),
    new Prisma.Decimal(0)
  );

  return {
    invoicedGross,
    concessions,
    invoicedNet,
    amountCollected,
    totalRefunds,
    totalAdjustments,
    netCollections,
    outstandingAmount: outstandingAmount.isNegative() ? new Prisma.Decimal(0) : outstandingAmount,
    totalInvoices: invoices.length,
    counts: {
      paid: paidCount,
      partiallyPaid: partiallyPaidCount,
      overdue: overdueCount,
      issued: issuedCount,
    },
    paymentMethods,
  };
}

/**
 * Compact fee position for one academic session, used on the school dashboard.
 * Amounts follow the per-invoice ledger: collected = paid - refunded, and
 * outstanding = net payable - collected. Cancelled invoices are excluded.
 */
export async function getFeeDashboardSummary(
  schoolId: string,
  user: AuthenticatedUser,
  academicYearId: string
) {
  assertCanViewSchoolFees(user, schoolId);

  const activeInvoices: Prisma.InvoiceWhereInput = {
    schoolId,
    academicYearId,
    status: { not: "CANCELLED" },
  };

  const [totals, overdueCount] = await Promise.all([
    prisma.invoice.aggregate({
      where: activeInvoices,
      _sum: { netAmount: true, paidAmount: true, refundedAmount: true },
      _count: { _all: true },
    }),
    prisma.invoice.count({
      where: {
        ...activeInvoices,
        status: { in: ["ISSUED", "PARTIALLY_PAID", "OVERDUE"] },
        dueDate: { lt: new Date() },
      },
    }),
  ]);

  const invoicedNet = toDecimal(totals._sum.netAmount);
  const collected = toDecimal(totals._sum.paidAmount).minus(toDecimal(totals._sum.refundedAmount));
  const outstanding = invoicedNet.minus(collected);

  return {
    totalInvoices: totals._count._all,
    invoicedNet,
    collected,
    outstanding: outstanding.isNegative() ? new Prisma.Decimal(0) : outstanding,
    overdueCount,
  };
}

export async function getCollectionReport(
  schoolId: string,
  user: AuthenticatedUser,
  filters?: {
    startDate?: string | Date;
    endDate?: string | Date;
    paymentMethod?: PaymentMethod;
  }
) {
  assertCanViewSchoolFees(user, schoolId);

  const dateFilter: Prisma.DateTimeFilter | undefined =
    filters?.startDate || filters?.endDate
      ? {
          gte: filters?.startDate ? new Date(filters.startDate) : undefined,
          lte: filters?.endDate ? new Date(filters.endDate) : undefined,
        }
      : undefined;

  const payments = await prisma.payment.findMany({
    where: {
      schoolId,
      paymentDate: dateFilter,
      paymentMethod: filters?.paymentMethod,
      isReversed: false,
    },
    include: {
      invoice: {
        include: {
          student: { select: { id: true, name: true, admissionNumber: true } },
          enrollment: {
            include: { section: { include: { class: true } } },
          },
        },
      },
      recordedBy: { select: { id: true, name: true } },
    },
    orderBy: { paymentDate: "desc" },
  });

  return payments;
}

export async function getClassWiseCollectionSummary(
  schoolId: string,
  user: AuthenticatedUser,
  academicYearId?: string
) {
  assertCanViewSchoolFees(user, schoolId);

  const classes = await prisma.class.findMany({
    where: { schoolId },
    include: {
      sections: {
        include: {
          enrollments: {
            where: {
              status: "ACTIVE",
              academicYearId: academicYearId || undefined,
            },
            include: {
              invoices: {
                where: {
                  status: { not: "CANCELLED" },
                  academicYearId: academicYearId || undefined,
                },
              },
            },
          },
        },
      },
    },
    orderBy: [{ numericOrder: "asc" }, { name: "asc" }],
  });

  return classes.map((cls) => {
    let studentCount = 0;
    let invoicedGross = new Prisma.Decimal(0);
    let concessions = new Prisma.Decimal(0);
    let invoicedNet = new Prisma.Decimal(0);
    let paidAmount = new Prisma.Decimal(0);
    let refundedAmount = new Prisma.Decimal(0);

    for (const sec of cls.sections) {
      studentCount += sec.enrollments.length;
      for (const enr of sec.enrollments) {
        for (const inv of enr.invoices) {
          invoicedGross = invoicedGross.plus(inv.grossAmount);
          concessions = concessions.plus(inv.concessionAmount);
          invoicedNet = invoicedNet.plus(inv.netAmount);
          paidAmount = paidAmount.plus(inv.paidAmount);
          refundedAmount = refundedAmount.plus(inv.refundedAmount);
        }
      }
    }

    const netCollected = paidAmount.minus(refundedAmount);
    const outstanding = invoicedNet.minus(netCollected);

    return {
      classId: cls.id,
      className: cls.name,
      studentCount,
      invoicedGross,
      concessions,
      invoicedNet,
      collected: netCollected,
      outstanding: outstanding.isNegative() ? new Prisma.Decimal(0) : outstanding,
      collectionPercentage: invoicedNet.greaterThan(0)
        ? netCollected.dividedBy(invoicedNet).times(100).toNumber().toFixed(1)
        : "100.0",
    };
  });
}

export async function getStudentFeeAccount(
  schoolId: string,
  user: AuthenticatedUser,
  studentId: string
) {
  assertCanViewSchoolFees(user, schoolId);

  const student = await prisma.student.findFirst({
    where: { id: studentId, schoolId },
    include: {
      enrollments: {
        where: { status: "ACTIVE" },
        include: {
          academicYear: { select: { id: true, name: true, isCurrent: true } },
          section: { include: { class: true } },
        },
      },
      invoices: {
        where: { status: { not: "CANCELLED" } },
        include: {
          feeStructure: { select: { id: true, name: true } },
          items: true,
          payments: {
            where: { isReversed: false },
            include: { recordedBy: { select: { id: true, name: true } } },
            orderBy: { paymentDate: "desc" },
          },
          adjustments: true,
          refunds: true,
        },
        orderBy: { issueDate: "desc" },
      },
    },
  });

  if (!student) {
    throw new NotFoundError("Student not found");
  }

  let totalGross = new Prisma.Decimal(0);
  let totalConcessions = new Prisma.Decimal(0);
  let totalNet = new Prisma.Decimal(0);
  let totalPaid = new Prisma.Decimal(0);
  let totalRefunded = new Prisma.Decimal(0);

  for (const inv of student.invoices) {
    totalGross = totalGross.plus(inv.grossAmount);
    totalConcessions = totalConcessions.plus(inv.concessionAmount);
    totalNet = totalNet.plus(inv.netAmount);
    totalPaid = totalPaid.plus(inv.paidAmount);
    totalRefunded = totalRefunded.plus(inv.refundedAmount);
  }

  const netCollected = totalPaid.minus(totalRefunded);
  const outstanding = totalNet.minus(netCollected);

  return {
    student: {
      id: student.id,
      name: student.name,
      admissionNumber: student.admissionNumber,
      dob: student.dob,
      gender: student.gender,
      currentEnrollment: student.enrollments[0] || null,
    },
    summary: {
      totalGross,
      totalConcessions,
      totalNet,
      totalPaid: netCollected,
      totalRefunded,
      outstandingAmount: outstanding.isNegative() ? new Prisma.Decimal(0) : outstanding,
    },
    invoices: student.invoices,
  };
}
