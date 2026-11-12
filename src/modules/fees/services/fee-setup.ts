// Fees: fee heads and fee structures.
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { FeeFrequency } from "@/generated/prisma/enums";
import {
  AuthenticatedUser,
  assertCanViewSchoolFees,
  assertCanConfigureSchoolFees,
} from "@/modules/auth";
import { BadRequestError, ConflictError, NotFoundError } from "@/lib/errors";
import { logAuditEvent } from "@/lib/audit";
import { FeeHeadInput, FeeStructureInput, FeeStructureItemInput, toDecimal } from "./fees-common";

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
