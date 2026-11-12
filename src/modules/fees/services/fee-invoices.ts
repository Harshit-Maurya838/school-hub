// Fees: invoice listing, generation and cancellation.
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { InvoiceStatus } from "@/generated/prisma/enums";
import {
  AuthenticatedUser,
  assertCanViewSchoolFees,
  assertCanGenerateInvoices,
  assertCanApproveFeeAdjustments,
} from "@/modules/auth";
import { BadRequestError, ConflictError, NotFoundError } from "@/lib/errors";
import { logAuditEvent } from "@/lib/audit";
import { GenerateInvoicesInput, formatMoney } from "./fees-common";
import { generateNextSequenceNumber } from "./fee-sequence";

// ============================================================================
// Invoices and Student Liabilities
// ============================================================================

export async function getInvoices(
  schoolId: string,
  user: AuthenticatedUser,
  query?: {
    studentId?: string;
    academicYearId?: string;
    classId?: string;
    status?: InvoiceStatus;
    search?: string;
    page?: number;
    limit?: number;
  }
) {
  assertCanViewSchoolFees(user, schoolId);

  const page = Math.max(1, query?.page || 1);
  const limit = Math.min(100, Math.max(1, query?.limit || 20));
  const skip = (page - 1) * limit;

  const whereClause: Prisma.InvoiceWhereInput = {
    schoolId,
    studentId: query?.studentId,
    academicYearId: query?.academicYearId,
    status: query?.status,
    ...(query?.classId
      ? {
          enrollment: {
            section: { classId: query.classId },
          },
        }
      : {}),
    ...(query?.search
      ? {
          OR: [
            { invoiceNumber: { contains: query.search, mode: "insensitive" } },
            { title: { contains: query.search, mode: "insensitive" } },
            { student: { name: { contains: query.search, mode: "insensitive" } } },
            { student: { admissionNumber: { contains: query.search, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where: whereClause,
      include: {
        student: {
          select: {
            id: true,
            name: true,
            admissionNumber: true,
          },
        },
        academicYear: { select: { id: true, name: true } },
        enrollment: {
          include: {
            section: {
              include: { class: { select: { id: true, name: true } } },
            },
          },
        },
        items: true,
        _count: {
          select: { payments: true, adjustments: true, refunds: true },
        },
      },
      orderBy: [{ issueDate: "desc" }, { invoiceNumber: "desc" }],
      skip,
      take: limit,
    }),
    prisma.invoice.count({ where: whereClause }),
  ]);

  const items = invoices.map((inv) => {
    const outstanding = inv.netAmount.minus(inv.paidAmount).plus(inv.refundedAmount);
    return {
      ...inv,
      outstandingAmount: outstanding.isNegative() ? new Prisma.Decimal(0) : outstanding,
    };
  });

  return {
    invoices: items,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getInvoiceById(schoolId: string, user: AuthenticatedUser, invoiceId: string) {
  assertCanViewSchoolFees(user, schoolId);

  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, schoolId },
    include: {
      student: {
        select: {
          id: true,
          name: true,
          admissionNumber: true,
          dob: true,
          gender: true,
        },
      },
      enrollment: {
        include: {
          section: {
            include: { class: { select: { id: true, name: true } } },
          },
        },
      },
      academicYear: { select: { id: true, name: true, isCurrent: true } },
      feeStructure: { select: { id: true, name: true, frequency: true } },
      items: {
        include: {
          feeHead: { select: { id: true, name: true, code: true } },
        },
      },
      payments: {
        include: {
          recordedBy: { select: { id: true, name: true, role: true } },
          reversedBy: { select: { id: true, name: true } },
        },
        orderBy: { paymentDate: "desc" },
      },
      adjustments: {
        include: {
          approvedBy: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      refunds: {
        include: {
          approvedBy: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      cancelledBy: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
    },
  });

  if (!invoice) {
    throw new NotFoundError("Invoice not found");
  }

  const outstanding = invoice.netAmount.minus(invoice.paidAmount).plus(invoice.refundedAmount);

  return {
    ...invoice,
    outstandingAmount: outstanding.isNegative() ? new Prisma.Decimal(0) : outstanding,
  };
}

export async function generateInvoicesFromStructure(
  schoolId: string,
  user: AuthenticatedUser,
  input: GenerateInvoicesInput
) {
  assertCanGenerateInvoices(user, schoolId);

  const structure = await prisma.feeStructure.findFirst({
    where: { id: input.feeStructureId, schoolId, isActive: true },
    include: {
      items: {
        include: { feeHead: true },
      },
    },
  });

  if (!structure) {
    throw new NotFoundError("Active fee structure not found in this school");
  }

  if (structure.items.length === 0) {
    throw new BadRequestError("Fee structure has no fee heads configured");
  }

  // Resolve target students
  let targetStudentIds: string[] = [];

  if (input.studentIds && input.studentIds.length > 0) {
    targetStudentIds = input.studentIds;
  } else {
    // Find all enrolled students in the target class or school
    const enrollments = await prisma.enrollment.findMany({
      where: {
        schoolId,
        academicYearId: input.academicYearId,
        status: "ACTIVE",
        ...(structure.classId
          ? { section: { classId: structure.classId } }
          : input.classId
            ? { section: { classId: input.classId } }
            : {}),
      },
      select: { studentId: true },
    });
    targetStudentIds = enrollments.map((e) => e.studentId);
  }

  if (targetStudentIds.length === 0) {
    throw new BadRequestError("No enrolled students found matching the invoice criteria");
  }

  const billingPeriod = input.billingPeriod?.trim() || null;
  const issueDate = input.issueDate ? new Date(input.issueDate) : new Date();
  const dueDate = input.dueDate
    ? new Date(input.dueDate)
    : structure.dueDate
      ? new Date(structure.dueDate)
      : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days default

  if (dueDate < issueDate) {
    throw new BadRequestError("Invoice due date cannot be earlier than issue date");
  }

  // Determine gross amount and line items snapshot
  const lineItemSnapshots = structure.items
    .filter((it) => !it.isOptional)
    .map((it) => ({
      feeHeadId: it.feeHeadId,
      headName: it.feeHead.name,
      amount: it.amount,
      concessionAmount: new Prisma.Decimal(0),
      netAmount: it.amount,
    }));

  const grossAmount = lineItemSnapshots.reduce(
    (sum, it) => sum.plus(it.amount),
    new Prisma.Decimal(0)
  );

  const createdInvoices = await prisma.$transaction(async (tx) => {
    const results = [];

    for (const studentId of targetStudentIds) {
      // Check duplicate invoice for same student, fee schedule, and billing period
      const existing = await tx.invoice.findFirst({
        where: {
          schoolId,
          studentId,
          feeStructureId: structure.id,
          billingPeriod: billingPeriod ?? undefined,
          status: { not: "CANCELLED" },
        },
      });

      if (existing) {
        // Skip duplicate student invoice or throw if single student requested
        if (targetStudentIds.length === 1) {
          throw new ConflictError(
            `An active invoice for this student, fee structure, and billing period already exists (${existing.invoiceNumber})`
          );
        }
        continue;
      }

      // Find active enrollment
      const enrollment = await tx.enrollment.findFirst({
        where: {
          studentId,
          schoolId,
          academicYearId: input.academicYearId,
          status: "ACTIVE",
        },
        select: { id: true },
      });

      const invoiceNumber = await generateNextSequenceNumber(tx, schoolId, "INV");

      const invoice = await tx.invoice.create({
        data: {
          schoolId,
          invoiceNumber,
          studentId,
          enrollmentId: enrollment?.id || null,
          academicYearId: input.academicYearId,
          feeStructureId: structure.id,
          title: `${structure.name}${billingPeriod ? ` - ${billingPeriod}` : ""}`,
          billingPeriod,
          issueDate,
          dueDate,
          status: "ISSUED",
          grossAmount,
          concessionAmount: new Prisma.Decimal(0),
          netAmount: grossAmount,
          paidAmount: new Prisma.Decimal(0),
          refundedAmount: new Prisma.Decimal(0),
          notes: input.notes?.trim() || null,
          createdById: user.id,
          items: {
            create: lineItemSnapshots.map((item) => ({
              schoolId,
              feeHeadId: item.feeHeadId,
              headName: item.headName,
              amount: item.amount,
              concessionAmount: item.concessionAmount,
              netAmount: item.netAmount,
            })),
          },
        },
        include: {
          items: true,
          student: { select: { id: true, name: true, admissionNumber: true } },
        },
      });

      results.push(invoice);
    }

    return results;
  });

  if (createdInvoices.length === 0) {
    throw new ConflictError("Invoices for all selected students already exist for this period");
  }

  await logAuditEvent({
    action: "INVOICE_GENERATED",
    entityType: "Invoice",
    entityId: createdInvoices[0]?.id || null,
    schoolId,
    userId: user.id,
    details: {
      count: createdInvoices.length,
      feeStructureId: structure.id,
      billingPeriod,
      totalGross: createdInvoices
        .reduce((sum, inv) => sum.plus(inv.grossAmount), new Prisma.Decimal(0))
        .toString(),
    },
  });

  return {
    generatedCount: createdInvoices.length,
    invoices: createdInvoices,
  };
}

export async function cancelInvoice(
  schoolId: string,
  user: AuthenticatedUser,
  invoiceId: string,
  params: { reason: string }
) {
  assertCanApproveFeeAdjustments(user, schoolId);

  const trimmedReason = params.reason?.trim();
  if (!trimmedReason) {
    throw new BadRequestError("A mandatory cancellation reason is required");
  }

  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, schoolId },
    include: { payments: { where: { isReversed: false } } },
  });

  if (!invoice) {
    throw new NotFoundError("Invoice not found");
  }

  if (invoice.status === "CANCELLED") {
    throw new BadRequestError("Invoice is already cancelled");
  }

  // Prevent cancellation if active unreversed payments exist
  const activePaid = invoice.paidAmount.minus(invoice.refundedAmount);
  if (activePaid.greaterThan(0)) {
    throw new BadRequestError(
      `Cannot cancel invoice with active collections of ${formatMoney(activePaid)}. Reverse or refund payments first.`
    );
  }

  const cancelled = await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      status: "CANCELLED",
      cancellationReason: trimmedReason,
      cancelledAt: new Date(),
      cancelledById: user.id,
    },
  });

  await logAuditEvent({
    action: "INVOICE_CANCELLED",
    entityType: "Invoice",
    entityId: invoiceId,
    schoolId,
    userId: user.id,
    details: {
      invoiceNumber: invoice.invoiceNumber,
      reason: trimmedReason,
      netAmount: invoice.netAmount.toString(),
    },
  });

  return cancelled;
}
