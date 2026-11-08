/**
 * Class fee plan service: reads and saves a class's monthly fee, admission fee and
 * additional costs for the active session.
 *
 * A plan is stored as ordinary fee structures, one per frequency (monthly, term, yearly,
 * one-time), so invoicing, reports and Fees management keep working unchanged. Every write
 * goes through createFeeHead / createFeeStructure / updateFeeStructure, which validate,
 * keep amounts in Decimal and audit. Invoices already issued keep their own item snapshot.
 */
import { prisma } from "@/lib/prisma";
import { BadRequestError, NotFoundError, PreconditionFailedError } from "@/lib/errors";
import {
  AuthenticatedUser,
  assertCanConfigureSchoolFees,
  assertCanViewSchoolFees,
} from "@/modules/auth";
import { createFeeHead, createFeeStructure, updateFeeStructure } from "./fees";
import {
  ADMISSION_HEAD,
  PLAN_FREQUENCIES,
  PLAN_STRUCTURE_SUFFIX,
  TUITION_HEAD,
  classFeePlanSchema,
  isAdmissionHead,
  isTuitionHead,
  summarisePlan,
  type ClassFeePlanSummary,
  type PlanFrequency,
} from "./class-fee-plan-rules";

export interface ClassFeePlanView extends ClassFeePlanSummary {
  classId: string;
  className: string;
  academicYear: { id: string; name: string };
  /** Active fee heads to pick additional costs from. */
  heads: { id: string; name: string; code: string | null }[];
  /** Class structures with a CUSTOM schedule; edited in Fees management only. */
  customStructures: number;
}

async function loadContext(schoolId: string, classId: string) {
  const cls = await prisma.class.findFirst({
    where: { id: classId, schoolId },
    select: { id: true, name: true },
  });
  if (!cls) throw new NotFoundError("Class not found in this school");

  const year = await prisma.academicYear.findFirst({
    where: { schoolId, isCurrent: true },
    select: { id: true, name: true },
  });
  if (!year) {
    throw new PreconditionFailedError("Activate an academic session before setting class fees.");
  }

  const structures = await prisma.feeStructure.findMany({
    where: { schoolId, classId, academicYearId: year.id, isActive: true },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      frequency: true,
      items: {
        orderBy: { createdAt: "asc" },
        select: {
          feeHeadId: true,
          amount: true,
          feeHead: { select: { name: true, code: true } },
        },
      },
    },
  });
  return { cls, year, structures };
}

export async function getClassFeePlan(
  schoolId: string,
  user: AuthenticatedUser,
  classId: string
): Promise<ClassFeePlanView> {
  assertCanViewSchoolFees(user, schoolId);
  const { cls, year, structures } = await loadContext(schoolId, classId);

  const items = structures
    .filter((s) => (PLAN_FREQUENCIES as readonly string[]).includes(s.frequency))
    .flatMap((s) =>
      s.items.map((i) => ({
        feeHeadId: i.feeHeadId,
        headName: i.feeHead.name,
        headCode: i.feeHead.code,
        amount: i.amount.toString(),
        frequency: s.frequency as PlanFrequency,
      }))
    );

  const heads = await prisma.feeHead.findMany({
    where: { schoolId, isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, code: true },
  });

  return {
    classId: cls.id,
    className: cls.name,
    academicYear: year,
    heads,
    customStructures: structures.filter((s) => s.frequency === "CUSTOM").length,
    ...summarisePlan(items),
  };
}

/** Finds the school's head by code or name (any case), creating it when there is none. */
async function ensureHead(
  schoolId: string,
  user: AuthenticatedUser,
  target: { name: string; code?: string },
  predicate: (h: { name: string; code: string | null }) => boolean
) {
  const heads = await prisma.feeHead.findMany({
    where: { schoolId },
    select: { id: true, name: true, code: true },
  });
  const found = heads.find(predicate);
  if (found) return found;
  const created = await createFeeHead(schoolId, user, { name: target.name, code: target.code });
  return { id: created.id, name: created.name };
}

export async function saveClassFeePlan(
  schoolId: string,
  user: AuthenticatedUser,
  classId: string,
  rawInput: unknown
): Promise<ClassFeePlanView> {
  assertCanConfigureSchoolFees(user, schoolId);
  const input = classFeePlanSchema.parse(rawInput);
  const { cls, year, structures } = await loadContext(schoolId, classId);

  // 1. Resolve every fee head the plan needs.
  const desired = new Map<PlanFrequency, { feeHeadId: string; amount: string }[]>(
    PLAN_FREQUENCIES.map((f) => [f, []])
  );
  const push = (frequency: PlanFrequency, feeHeadId: string, amount: string, label: string) => {
    const list = desired.get(frequency)!;
    if (list.some((i) => i.feeHeadId === feeHeadId)) {
      throw new BadRequestError(
        `${label} appears twice as a ${frequency.toLowerCase().replace("_", "-")} charge. Combine them into one amount.`
      );
    }
    list.push({ feeHeadId, amount });
  };

  if (input.monthlyFee) {
    const tuition = await ensureHead(schoolId, user, TUITION_HEAD, isTuitionHead);
    push("MONTHLY", tuition.id, input.monthlyFee, tuition.name);
  }
  if (input.admissionFee) {
    const admission = await ensureHead(schoolId, user, ADMISSION_HEAD, isAdmissionHead);
    push("ONE_TIME", admission.id, input.admissionFee, admission.name);
  }

  for (const row of input.additional) {
    let headId = row.feeHeadId;
    let label = "A fee head";
    if (row.newHeadName) {
      const name = row.newHeadName;
      const head = await ensureHead(
        schoolId,
        user,
        { name },
        (h) => h.name.trim().toLowerCase() === name.toLowerCase()
      );
      headId = head.id;
      label = head.name;
    } else {
      const head = await prisma.feeHead.findFirst({
        where: { id: headId, schoolId },
        select: { name: true },
      });
      if (!head) throw new BadRequestError("A selected fee head does not belong to this school");
      label = head.name;
    }
    push(row.frequency, headId!, row.amount, label);
  }

  // 2. Write one structure per frequency: update the first existing one, retire duplicates,
  //    create when missing, and retire the frequency when it has nothing left.
  for (const frequency of PLAN_FREQUENCIES) {
    const items = desired.get(frequency)!;
    const existing = structures.filter((s) => s.frequency === frequency);

    if (items.length === 0) {
      for (const s of existing) {
        await updateFeeStructure(schoolId, user, s.id, { isActive: false });
      }
      continue;
    }

    if (existing.length > 0) {
      await updateFeeStructure(schoolId, user, existing[0].id, { items });
      for (const s of existing.slice(1)) {
        await updateFeeStructure(schoolId, user, s.id, { isActive: false });
      }
      continue;
    }

    // Reuse a retired structure with the conventional name rather than clash with it.
    const name = `${cls.name} · ${PLAN_STRUCTURE_SUFFIX[frequency]}`;
    const retired = await prisma.feeStructure.findFirst({
      where: { schoolId, classId, academicYearId: year.id, name, isActive: false },
      select: { id: true },
    });
    if (retired) {
      await updateFeeStructure(schoolId, user, retired.id, {
        items,
        frequency,
        isActive: true,
      });
    } else {
      await createFeeStructure(schoolId, user, {
        academicYearId: year.id,
        classId,
        name,
        frequency,
        description: "Set from Classes & Subjects",
        items,
      });
    }
  }

  return getClassFeePlan(schoolId, user, classId);
}
