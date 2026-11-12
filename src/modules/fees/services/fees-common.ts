// Fees: shared input types, Decimal helpers and school resolution.
import { Prisma } from "@/generated/prisma/client";
import {
  FeeFrequency,
  PaymentMethod,
  AdjustmentType,
  RefundMethod,
} from "@/generated/prisma/enums";
import { AuthenticatedUser, assertCanViewSchoolFees, findSchoolBySlug } from "@/modules/auth";
import { ForbiddenError } from "@/lib/errors";

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
// Tenant Resolution
// ============================================================================

export async function resolveSchoolForFees(schoolSlug: string, user: AuthenticatedUser) {
  const school = await findSchoolBySlug(schoolSlug);

  if (!school.isActive) {
    throw new ForbiddenError(`School '${school.name}' is currently suspended`);
  }

  assertCanViewSchoolFees(user, school.id);
  return school;
}
