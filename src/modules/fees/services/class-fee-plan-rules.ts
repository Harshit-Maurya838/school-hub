/**
 * Class fee plan: how a class's fee structures read as "monthly fee, admission fee and
 * additional costs" on the Classes & Subjects screen.
 *
 * Client-safe (no Prisma or server imports) so the screen and the service agree on which
 * fee head is tuition, which is admission, and how amounts are validated.
 */
import { z } from "zod";

/** Frequencies a class plan manages. CUSTOM structures stay in Fees management. */
export const PLAN_FREQUENCIES = ["MONTHLY", "TERM", "ANNUAL", "ONE_TIME"] as const;
export type PlanFrequency = (typeof PLAN_FREQUENCIES)[number];

export const PLAN_FREQUENCY_LABEL: Record<PlanFrequency, string> = {
  MONTHLY: "Monthly",
  TERM: "Per term",
  ANNUAL: "Yearly",
  ONE_TIME: "One-time",
};

/** Name given to the class structure that holds a frequency's items, when one is created. */
export const PLAN_STRUCTURE_SUFFIX: Record<PlanFrequency, string> = {
  MONTHLY: "Monthly fees",
  TERM: "Term charges",
  ANNUAL: "Annual charges",
  ONE_TIME: "One-time charges",
};

export const TUITION_HEAD = { name: "Tuition Fee", code: "TUIT" } as const;
export const ADMISSION_HEAD = { name: "Admission Fee", code: "ADMN" } as const;

type HeadLike = { name: string; code: string | null };
const matches = (head: HeadLike, target: { name: string; code: string }) =>
  head.code?.toUpperCase() === target.code ||
  head.name.trim().toLowerCase() === target.name.toLowerCase();

export const isTuitionHead = (head: HeadLike) => matches(head, TUITION_HEAD);
export const isAdmissionHead = (head: HeadLike) => matches(head, ADMISSION_HEAD);

/** Rupees with at most two decimals, as a string so no float ever touches money. */
export const rupeeAmount = z
  .string({ error: "Enter an amount" })
  .trim()
  .regex(/^\d{1,10}(\.\d{1,2})?$/, "Enter an amount in rupees, e.g. 1500 or 1500.50");

const positiveRupees = rupeeAmount.refine((v) => Number(v) > 0, "Amount must be more than ₹0");

export const classFeePlanSchema = z
  .object({
    /** Tuition charged every month; null removes it. */
    monthlyFee: positiveRupees.nullable(),
    /** Charged once at admission; null removes it. */
    admissionFee: positiveRupees.nullable(),
    additional: z
      .array(
        z
          .object({
            feeHeadId: z.string().trim().min(1).optional(),
            /** Creates (or reuses, by name) a fee head instead of picking one. */
            newHeadName: z.string().trim().min(2, "Fee head name is too short").max(80).optional(),
            amount: positiveRupees,
            frequency: z.enum(PLAN_FREQUENCIES),
          })
          .refine((r) => Boolean(r.feeHeadId) !== Boolean(r.newHeadName), {
            message: "Pick a fee head or name a new one",
          })
      )
      .max(40, "Too many additional costs"),
  })
  .strict();

export type ClassFeePlanInput = z.input<typeof classFeePlanSchema>;

export interface ClassFeePlanItem {
  feeHeadId: string;
  headName: string;
  amount: string;
  frequency: PlanFrequency;
}

export interface ClassFeePlanSummary {
  monthlyFee: string | null;
  admissionFee: string | null;
  additional: ClassFeePlanItem[];
}

/** Splits a class's items into monthly fee, admission fee and additional costs. */
export function summarisePlan(
  items: (ClassFeePlanItem & { headCode: string | null })[]
): ClassFeePlanSummary {
  let monthlyFee: string | null = null;
  let admissionFee: string | null = null;
  const additional: ClassFeePlanItem[] = [];
  for (const item of items) {
    const head = { name: item.headName, code: item.headCode };
    if (monthlyFee === null && item.frequency === "MONTHLY" && isTuitionHead(head)) {
      monthlyFee = item.amount;
    } else if (admissionFee === null && item.frequency === "ONE_TIME" && isAdmissionHead(head)) {
      admissionFee = item.amount;
    } else {
      additional.push({
        feeHeadId: item.feeHeadId,
        headName: item.headName,
        amount: item.amount,
        frequency: item.frequency,
      });
    }
  }
  return { monthlyFee, admissionFee, additional };
}
