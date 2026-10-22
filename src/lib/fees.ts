// Fees and Finance Management Service Layer
import { prisma } from "./prisma";
import { Prisma } from "@/generated/prisma/client";
import {
  FeeFrequency,
  InvoiceStatus,
  PaymentMethod,
  AdjustmentType,
  RefundMethod,
} from "@/generated/prisma/enums";
import { AuthenticatedUser } from "./auth";
import { BadRequestError, ConflictError, NotFoundError, ForbiddenError } from "./errors";
import { logAuditEvent } from "./audit";
import {
  assertCanViewSchoolFees,
  assertCanConfigureSchoolFees,
  assertCanGenerateInvoices,
  assertCanCollectSchoolFees,
  assertCanApproveFeeAdjustments,
} from "./rbac";

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface FeeHeadInput {
  name: string;
  code?: string | null;
  description?: string | null;
  isActive?: boolean;
}

export interface FeeStructureItemInput {
  feeHeadId: string;
  amount: number | string | Prisma.Decimal;
  isOptional?: boolean;
}

export interface FeeStructureInput {
  academicYearId: string;
  classId?: string | null;
  name: string;
  description?: string | null;
  frequency?: FeeFrequency;
  dueDate?: string | Date | null;
  items: FeeStructureItemInput[];
}

export interface GenerateInvoicesInput {
  feeStructureId: string;
  academicYearId: string;
  classId?: string | null;
  studentIds?: string[];
  billingPeriod?: string | null;
  issueDate?: string | Date;
  dueDate?: string | Date;
  notes?: string | null;
}

export interface CollectPaymentInput {
  invoiceId: string;
  amount: number | string | Prisma.Decimal;
  paymentMethod: PaymentMethod;
  paymentDate?: string | Date;
  transactionReference?: string | null;
  remarks?: string | null;
}

export interface FeeAdjustmentInput {
  type?: AdjustmentType;
  amount: number | string | Prisma.Decimal;
  reason: string;
}

export interface RefundInput {
  amount: number | string | Prisma.Decimal;
  reason: string;
  reference?: string | null;
  refundMethod?: RefundMethod;
  paymentId?: string | null;
}

// ============================================================================
// Decimal Arithmetic Utilities
// ============================================================================

export function toDecimal(
  val: number | string | Prisma.Decimal | null | undefined
): Prisma.Decimal {
  if (val === null || val === undefined) return new Prisma.Decimal(0);
  if (val instanceof Prisma.Decimal) return val;
  return new Prisma.Decimal(val);
}

export function formatMoney(val: number | string | Prisma.Decimal | null | undefined): string {
  return toDecimal(val).toFixed(2);
}

// ============================================================================
// Sequence Generator for Invoices, Receipts, and Refunds
// ============================================================================

async function generateNextSequenceNumber(
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

// ============================================================================
// Tenant Resolution
// ============================================================================

export async function resolveSchoolForFees(schoolSlug: string, user: AuthenticatedUser) {
  const school = await prisma.school.findUnique({
    where: { slug: schoolSlug },
    select: { id: true, name: true, slug: true, isActive: true },
  });

  if (!school) {
    throw new NotFoundError(`School with slug '${schoolSlug}' not found`);
  }

  if (!school.isActive) {
    throw new ForbiddenError(`School '${school.name}' is currently suspended`);
  }

  assertCanViewSchoolFees(user, school.id);
  return school;
}

// ============================================================================
// Fee Heads
// ============================================================================

export async function getFeeHeads(schoolId: string, user: AuthenticatedUser) {
  assertCanViewSchoolFees(user, schoolId);

  return prisma.feeHead.findMany({
    where: { schoolId },
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: {
          structureItems: true,
          invoiceItems: true,
        },
      },
    },
  });
}

export async function createFeeHead(
  schoolId: string,
  user: AuthenticatedUser,
  input: FeeHeadInput
) {
  assertCanConfigureSchoolFees(user, schoolId);

  const trimmedName = input.name?.trim();
  if (!trimmedName) {
    throw new BadRequestError("Fee head name is required");
  }

  const existing = await prisma.feeHead.findUnique({
    where: {
      schoolId_name: {
        schoolId,
        name: trimmedName,
      },
    },
  });

  if (existing) {
    throw new ConflictError(`Fee head '${trimmedName}' already exists in this school`);
  }

  const head = await prisma.feeHead.create({
    data: {
      schoolId,
      name: trimmedName,
      code: input.code?.trim().toUpperCase() || null,
      description: input.description?.trim() || null,
      isActive: input.isActive ?? true,
    },
  });

  await logAuditEvent({
    action: "FEE_HEAD_CREATED",
    entityType: "FeeHead",
    entityId: head.id,
    schoolId,
    userId: user.id,
    details: { name: head.name, code: head.code },
  });

  return head;
}

export async function updateFeeHead(
  schoolId: string,
  user: AuthenticatedUser,
  id: string,
  input: Partial<FeeHeadInput>
) {
  assertCanConfigureSchoolFees(user, schoolId);

  const existing = await prisma.feeHead.findFirst({
    where: { id, schoolId },
  });

  if (!existing) {
    throw new NotFoundError("Fee head not found");
  }

  let nameToUpdate = existing.name;
  if (input.name !== undefined) {
    const trimmed = input.name.trim();
    if (!trimmed) throw new BadRequestError("Fee head name cannot be empty");
    if (trimmed !== existing.name) {
      const duplicate = await prisma.feeHead.findUnique({
        where: { schoolId_name: { schoolId, name: trimmed } },
      });
      if (duplicate) {
        throw new ConflictError(`Fee head '${trimmed}' already exists`);
      }
      nameToUpdate = trimmed;
    }
  }

  const updated = await prisma.feeHead.update({
    where: { id },
    data: {
      name: nameToUpdate,
      code: input.code !== undefined ? input.code?.trim().toUpperCase() || null : undefined,
      description: input.description !== undefined ? input.description?.trim() || null : undefined,
      isActive: input.isActive !== undefined ? input.isActive : undefined,
    },
  });

  await logAuditEvent({
    action: "FEE_HEAD_UPDATED",
    entityType: "FeeHead",
    entityId: updated.id,
    schoolId,
    userId: user.id,
    details: { name: updated.name, isActive: updated.isActive },
  });

  return updated;
}

// ============================================================================
// Fee Structures
// ============================================================================

export async function getFeeStructures(
  schoolId: string,
  user: AuthenticatedUser,
  filters?: { academicYearId?: string; classId?: string }
) {
  assertCanViewSchoolFees(user, schoolId);

  const structures = await prisma.feeStructure.findMany({
    where: {
      schoolId,
      academicYearId: filters?.academicYearId,
      classId: filters?.classId !== undefined ? filters.classId : undefined,
    },
    include: {
      academicYear: { select: { id: true, name: true, isCurrent: true } },
      class: { select: { id: true, name: true } },
      items: {
        include: {
          feeHead: { select: { id: true, name: true, code: true } },
        },
      },
      _count: {
        select: { invoices: true },
      },
    },
    orderBy: [{ academicYear: { startDate: "desc" } }, { name: "asc" }],
  });

  return structures.map((st) => {
    const totalAmount = st.items.reduce(
      (sum, item) => sum.plus(item.amount),
      new Prisma.Decimal(0)
    );
    return {
      ...st,
      totalAmount,
    };
  });
}

export async function getFeeStructureById(schoolId: string, user: AuthenticatedUser, id: string) {
  assertCanViewSchoolFees(user, schoolId);

  const structure = await prisma.feeStructure.findFirst({
    where: { id, schoolId },
    include: {
      academicYear: { select: { id: true, name: true, isCurrent: true } },
      class: { select: { id: true, name: true } },
      items: {
        include: {
          feeHead: { select: { id: true, name: true, code: true } },
        },
      },
      _count: {
        select: { invoices: true },
      },
    },
  });

  if (!structure) {
    throw new NotFoundError("Fee structure not found");
  }

  const totalAmount = structure.items.reduce(
    (sum, item) => sum.plus(item.amount),
    new Prisma.Decimal(0)
  );

  return {
    ...structure,
    totalAmount,
  };
}

export async function createFeeStructure(
  schoolId: string,
  user: AuthenticatedUser,
  input: FeeStructureInput
) {
  assertCanConfigureSchoolFees(user, schoolId);

  const trimmedName = input.name?.trim();
  if (!trimmedName) {
    throw new BadRequestError("Fee structure name is required");
  }

  if (!input.academicYearId) {
    throw new BadRequestError("Academic year is required");
  }

  // Validate Academic Year
  const year = await prisma.academicYear.findFirst({
    where: { id: input.academicYearId, schoolId },
  });
  if (!year) {
    throw new BadRequestError("Academic year does not belong to this school");
  }

  // Validate Class if specified
  if (input.classId) {
    const cls = await prisma.class.findFirst({
      where: { id: input.classId, schoolId },
    });
    if (!cls) {
      throw new BadRequestError("Class does not belong to this school");
    }
  }

  // Validate Items
  if (!input.items || input.items.length === 0) {
    throw new BadRequestError("At least one fee head item is required in a fee structure");
  }

  // Check unique heads in input
  const headIds = input.items.map((it) => it.feeHeadId);
  if (new Set(headIds).size !== headIds.length) {
    throw new BadRequestError("Duplicate fee heads cannot be added to the same structure");
  }

  // Verify all heads exist and belong to tenant
  const heads = await prisma.feeHead.findMany({
    where: { id: { in: headIds }, schoolId },
  });
  if (heads.length !== headIds.length) {
    throw new BadRequestError("One or more fee heads do not belong to this school");
  }

  // Validate amounts
  for (const item of input.items) {
    const amt = toDecimal(item.amount);
    if (amt.isNegative()) {
      throw new BadRequestError("Fee head amount cannot be negative");
    }
  }

  // Check duplicate configuration
  const duplicate = await prisma.feeStructure.findFirst({
    where: {
      schoolId,
      academicYearId: input.academicYearId,
      classId: input.classId || null,
      name: trimmedName,
    },
  });
  if (duplicate) {
    throw new ConflictError(
      `Fee structure '${trimmedName}' already exists for this academic year and class`
    );
  }

  const structure = await prisma.$transaction(async (tx) => {
    const created = await tx.feeStructure.create({
      data: {
        schoolId,
        academicYearId: input.academicYearId,
        classId: input.classId || null,
        name: trimmedName,
        description: input.description?.trim() || null,
        frequency: input.frequency || "TERM",
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
        items: {
          create: input.items.map((it) => ({
            schoolId,
            feeHeadId: it.feeHeadId,
            amount: toDecimal(it.amount),
            isOptional: it.isOptional ?? false,
          })),
        },
      },
      include: {
        academicYear: { select: { id: true, name: true } },
        class: { select: { id: true, name: true } },
        items: {
          include: {
            feeHead: { select: { id: true, name: true, code: true } },
          },
        },
      },
    });

    return created;
  });

  await logAuditEvent({
    action: "FEE_STRUCTURE_CREATED",
    entityType: "FeeStructure",
    entityId: structure.id,
    schoolId,
    userId: user.id,
    details: {
      name: structure.name,
      academicYearId: structure.academicYearId,
      classId: structure.classId,
      itemCount: structure.items.length,
    },
  });

  return structure;
}

export async function updateFeeStructure(
  schoolId: string,
  user: AuthenticatedUser,
  id: string,
  input: {
    name?: string;
    description?: string | null;
    frequency?: FeeFrequency;
    dueDate?: string | Date | null;
    isActive?: boolean;
    items?: FeeStructureItemInput[];
  }
) {
  assertCanConfigureSchoolFees(user, schoolId);

  const existing = await prisma.feeStructure.findFirst({
    where: { id, schoolId },
    include: { _count: { select: { invoices: true } } },
  });

  if (!existing) {
    throw new NotFoundError("Fee structure not found");
  }

  const updated = await prisma.$transaction(async (tx) => {
    let nameToUpdate = existing.name;
    if (input.name !== undefined) {
      const trimmed = input.name.trim();
      if (!trimmed) throw new BadRequestError("Fee structure name cannot be empty");
      nameToUpdate = trimmed;
    }

    if (input.items && input.items.length > 0) {
      const headIds = input.items.map((it) => it.feeHeadId);
      if (new Set(headIds).size !== headIds.length) {
        throw new BadRequestError("Duplicate fee heads cannot be added to the same structure");
      }
      const heads = await tx.feeHead.findMany({
        where: { id: { in: headIds }, schoolId },
      });
      if (heads.length !== headIds.length) {
        throw new BadRequestError("One or more fee heads do not belong to this school");
      }

      for (const item of input.items) {
        if (toDecimal(item.amount).isNegative()) {
          throw new BadRequestError("Fee head amount cannot be negative");
        }
      }

      // Recreate items
      await tx.feeStructureItem.deleteMany({
        where: { feeStructureId: id },
      });

      await tx.feeStructureItem.createMany({
        data: input.items.map((it) => ({
          schoolId,
          feeStructureId: id,
          feeHeadId: it.feeHeadId,
          amount: toDecimal(it.amount),
          isOptional: it.isOptional ?? false,
        })),
      });
    }

    const res = await tx.feeStructure.update({
      where: { id },
      data: {
        name: nameToUpdate,
        description: input.description !== undefined ? input.description : undefined,
        frequency: input.frequency !== undefined ? input.frequency : undefined,
        dueDate:
          input.dueDate !== undefined
            ? input.dueDate
              ? new Date(input.dueDate)
              : null
            : undefined,
        isActive: input.isActive !== undefined ? input.isActive : undefined,
      },
      include: {
        academicYear: { select: { id: true, name: true } },
        class: { select: { id: true, name: true } },
        items: {
          include: {
            feeHead: { select: { id: true, name: true, code: true } },
          },
        },
      },
    });

    return res;
  });

  await logAuditEvent({
    action: "FEE_STRUCTURE_UPDATED",
    entityType: "FeeStructure",
    entityId: updated.id,
    schoolId,
    userId: user.id,
    details: { name: updated.name, isActive: updated.isActive },
  });

  return updated;
}

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
