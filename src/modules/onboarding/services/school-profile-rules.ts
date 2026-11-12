/**
 * Master School Profile: option catalogues and validation rules.
 *
 * Client-safe (no Prisma or server imports) so the wizard and the API share one
 * source of truth for labels, cross-field rules and normalisation.
 */
import { z } from "zod";

// ---------------------------------------------------------------------------
// Option catalogues (values mirror the Prisma enums)
// ---------------------------------------------------------------------------

export const PROFILE_STEPS = ["identity", "academic", "leadership"] as const;
export type ProfileStep = (typeof PROFILE_STEPS)[number];

export const INSTRUCTION_MEDIUMS = [
  { value: "ENGLISH", label: "English Medium" },
  { value: "HINDI", label: "Hindi Medium" },
  { value: "BILINGUAL", label: "Bilingual (English & Hindi)" },
  { value: "URDU", label: "Urdu Medium" },
] as const;

export const CLASS_RANGES = [
  { value: "CLASS_1_TO_5", label: "Class 1 to Class 5 (Primary)", start: 1, end: 5 },
  { value: "CLASS_1_TO_8", label: "Class 1 to Class 8 (Upper Primary)", start: 1, end: 8 },
  { value: "CLASS_1_TO_10", label: "Class 1 to Class 10 (Secondary)", start: 1, end: 10 },
  { value: "CLASS_1_TO_12", label: "Class 1 to Class 12 (Senior Secondary)", start: 1, end: 12 },
  { value: "CLASS_6_TO_8", label: "Class 6 to Class 8", start: 6, end: 8 },
  { value: "CLASS_6_TO_10", label: "Class 6 to Class 10", start: 6, end: 10 },
  { value: "CLASS_6_TO_12", label: "Class 6 to Class 12", start: 6, end: 12 },
  { value: "CLASS_9_TO_10", label: "Class 9 to Class 10", start: 9, end: 10 },
  { value: "CLASS_9_TO_12", label: "Class 9 to Class 12", start: 9, end: 12 },
  { value: "CLASS_11_TO_12", label: "Class 11 to Class 12", start: 11, end: 12 },
] as const;

export const RTE_ENTRY_CLASSES = [
  { value: "NURSERY", label: "Nursery" },
  { value: "CLASS_1", label: "Class 1" },
] as const;

export const RTE_EXIT_CLASSES = [
  { value: "CLASS_5", label: "Class 5", grade: 5 },
  { value: "CLASS_8", label: "Class 8", grade: 8 },
] as const;

export const BOARD_AFFILIATIONS = [
  { value: "CBSE", label: "CBSE" },
  { value: "CISCE", label: "CISCE (ICSE / ISC)" },
  { value: "STATE_BOARD", label: "State Board" },
  { value: "NIOS", label: "NIOS" },
  { value: "IB", label: "International Baccalaureate (IB)" },
  { value: "CAMBRIDGE", label: "Cambridge (CAIE)" },
] as const;

export const SCHOOL_STREAMS = [
  { value: "SCIENCE", label: "Science", hint: "PCM / PCB / General Science" },
  { value: "ARTS", label: "Arts / Humanities", hint: "History, Geography, Literature" },
  { value: "COMMERCE", label: "Commerce", hint: "Accountancy, Economics, Business" },
  { value: "AGRICULTURE", label: "Agriculture", hint: "Agronomy, Horticulture" },
  {
    value: "VOCATIONAL",
    label: "Vocational / Skill Subjects",
    hint: "Information Technology, Trades & Computer Science",
  },
] as const;

export const HOS_DESIGNATIONS = [
  { value: "PRINCIPAL", label: "Principal" },
  { value: "HEADMASTER", label: "Headmaster" },
  { value: "HEADMISTRESS", label: "Headmistress" },
  { value: "ACTING_PRINCIPAL", label: "Acting Principal" },
  { value: "TEACHER_IN_CHARGE", label: "Teacher In-Charge" },
  { value: "DIRECTOR", label: "Director" },
] as const;

type Values<T extends readonly { value: string }[]> = T[number]["value"];
export type InstructionMediumValue = Values<typeof INSTRUCTION_MEDIUMS>;
export type ClassRangeValue = Values<typeof CLASS_RANGES>;
export type RteEntryValue = Values<typeof RTE_ENTRY_CLASSES>;
export type RteExitValue = Values<typeof RTE_EXIT_CLASSES>;
export type BoardValue = Values<typeof BOARD_AFFILIATIONS>;
export type StreamValue = Values<typeof SCHOOL_STREAMS>;
export type HosDesignationValue = Values<typeof HOS_DESIGNATIONS>;

const valuesOf = <T extends readonly { value: string }[]>(list: T) =>
  list.map((o) => o.value) as unknown as [Values<T>, ...Values<T>[]];

export function labelFor(list: readonly { value: string; label: string }[], value?: string | null) {
  return list.find((o) => o.value === value)?.label ?? "";
}

export function getClassRange(value?: string | null) {
  return CLASS_RANGES.find((r) => r.value === value) ?? null;
}

/** Pre-primary (Nursery, LKG, UKG) can only precede a range that starts at Class 1. */
export function canIncludePrePrimary(range?: string | null) {
  return getClassRange(range)?.start === 1;
}

/** RTE 25% entry-level admission applies only to schools that admit at Class 1 or below. */
export function canApplyRte(range?: string | null) {
  return getClassRange(range)?.start === 1;
}

/** Streams are offered only when the school runs Class 11 and 12. */
export function offersSeniorSecondary(range?: string | null) {
  return getClassRange(range)?.end === 12;
}

export function allowedRteExitClasses(range?: string | null) {
  const end = getClassRange(range)?.end ?? 0;
  return RTE_EXIT_CLASSES.filter((c) => c.grade <= end);
}

export function describeActiveRange(range?: string | null, includesPrePrimary?: boolean) {
  const r = getClassRange(range);
  if (!r) return "";
  const from = includesPrePrimary && r.start === 1 ? "Nursery" : `Class ${r.start}`;
  return `${from} to Class ${r.end}`;
}

// ---------------------------------------------------------------------------
// Phone normalisation (stored as +91XXXXXXXXXX)
// ---------------------------------------------------------------------------

function digitsOnly(value: string) {
  return value.replace(/[\s\-().]/g, "");
}

/** Indian mobile: 10 digits starting 6–9, optional +91 / 91 / 0 prefix. */
export function normalizeIndianMobile(value: string): string | null {
  const match = /^(?:\+?91|0)?([6-9]\d{9})$/.exec(digitsOnly(value));
  return match ? `+91${match[1]}` : null;
}

/** Indian mobile or landline with STD code: 10 digits, optional +91 / 91 / 0 prefix. */
export function normalizeIndianPhone(value: string): string | null {
  const match = /^(?:\+?91|0)?(\d{10})$/.exec(digitsOnly(value));
  return match ? `+91${match[1]}` : null;
}

export function formatIndianPhone(value?: string | null) {
  if (!value) return "";
  const match = /^\+91(\d{5})(\d{5})$/.exec(value);
  return match ? `+91 ${match[1]} ${match[2]}` : value;
}

// ---------------------------------------------------------------------------
// Step schemas
// ---------------------------------------------------------------------------

const requiredText = (label: string, min: number, max: number) =>
  z
    .string({ error: `${label} is required` })
    .trim()
    .min(1, `${label} is required`)
    .min(min, `${label} must be at least ${min} characters`)
    .max(max, `${label} must be at most ${max} characters`);

const requiredEmail = (label: string) =>
  z
    .string({ error: `${label} is required` })
    .trim()
    .toLowerCase()
    .min(1, `${label} is required`)
    .pipe(z.email(`Enter a valid ${label.toLowerCase()}`));

const mobile = (label: string) =>
  z
    .string({ error: `${label} is required` })
    .trim()
    .min(1, `${label} is required`)
    .refine((v) => normalizeIndianMobile(v) !== null, {
      message: "Enter a valid 10-digit Indian mobile number",
    })
    .transform((v) => normalizeIndianMobile(v) as string);

const phone = (label: string) =>
  z
    .string({ error: `${label} is required` })
    .trim()
    .min(1, `${label} is required`)
    .refine((v) => normalizeIndianPhone(v) !== null, {
      message: "Enter a valid 10-digit phone number (mobile or landline with STD code)",
    })
    .transform((v) => normalizeIndianPhone(v) as string);

const requiredEnum = <T extends readonly { value: string }[]>(list: T, label: string) =>
  z.enum(valuesOf(list), { error: `Select ${label}` });

export const identityStepSchema = z.object({
  name: requiredText("School name (English)", 2, 100),
  udiseCode: z
    .string({ error: "U-DISE code is required" })
    .trim()
    .min(1, "U-DISE code is required")
    .regex(/^\d{11}$/, "U-DISE code must be exactly 11 digits"),
  establishmentYear: z.preprocess(
    (v) => (v === "" || v === null ? undefined : v),
    z.coerce
      .number({ error: "Establishment year is required" })
      .int("Establishment year must be a whole year")
      .min(1800, "Establishment year must be 1800 or later")
      .refine((y) => y <= new Date().getFullYear(), {
        message: "Establishment year cannot be in the future",
      })
  ),
  recognitionNumber: requiredText("Recognition / affiliation number", 2, 60),
  officialEmail: requiredEmail("Official email"),
  contactMobile: mobile("School contact mobile"),
  postalAddress: requiredText("Full postal address", 10, 300),
});

export const academicStepSchema = z
  .object({
    instructionMedium: requiredEnum(INSTRUCTION_MEDIUMS, "the medium of instruction"),
    classRange: requiredEnum(CLASS_RANGES, "the recognised class range"),
    includesPrePrimary: z.boolean().default(false),
    rteApplicable: z.boolean().default(false),
    rteEntryClass: z.enum(valuesOf(RTE_ENTRY_CLASSES)).nullish(),
    rteExitClass: z.enum(valuesOf(RTE_EXIT_CLASSES)).nullish(),
    boardAffiliation: requiredEnum(BOARD_AFFILIATIONS, "the board affiliation"),
    stateBoardName: z.string().trim().max(80, "State board name is too long").nullish(),
    streams: z.array(z.enum(valuesOf(SCHOOL_STREAMS))).default([]),
  })
  .superRefine((v, ctx) => {
    const range = getClassRange(v.classRange);

    if (v.includesPrePrimary && !canIncludePrePrimary(v.classRange)) {
      ctx.addIssue({
        code: "custom",
        path: ["includesPrePrimary"],
        message: "Pre-primary can only be added when the class range starts at Class 1",
      });
    }

    if (v.rteApplicable) {
      if (!canApplyRte(v.classRange)) {
        ctx.addIssue({
          code: "custom",
          path: ["rteApplicable"],
          message: "RTE applies only to schools whose class range starts at Class 1",
        });
      }
      if (!v.rteEntryClass) {
        ctx.addIssue({
          code: "custom",
          path: ["rteEntryClass"],
          message: "Select the RTE start class",
        });
      } else if (v.rteEntryClass === "NURSERY" && !v.includesPrePrimary) {
        ctx.addIssue({
          code: "custom",
          path: ["rteEntryClass"],
          message: "Nursery entry requires the pre-primary section",
        });
      }
      if (!v.rteExitClass) {
        ctx.addIssue({
          code: "custom",
          path: ["rteExitClass"],
          message: "Select the RTE end class",
        });
      } else if (
        range &&
        !allowedRteExitClasses(v.classRange).some((c) => c.value === v.rteExitClass)
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["rteExitClass"],
          message: `RTE end class cannot be above Class ${range.end}`,
        });
      }
    }

    if (v.boardAffiliation === "STATE_BOARD" && !v.stateBoardName) {
      ctx.addIssue({
        code: "custom",
        path: ["stateBoardName"],
        message: "Enter the state board name",
      });
    }

    if (offersSeniorSecondary(v.classRange)) {
      if (v.streams.length === 0) {
        ctx.addIssue({
          code: "custom",
          path: ["streams"],
          message: "Select at least one stream offered in Class 11 and 12",
        });
      }
    } else if (v.streams.length > 0) {
      ctx.addIssue({
        code: "custom",
        path: ["streams"],
        message: "Streams apply only when the class range goes up to Class 12",
      });
    }
  })
  .transform((v) => ({
    ...v,
    includesPrePrimary: canIncludePrePrimary(v.classRange) ? v.includesPrePrimary : false,
    rteEntryClass: v.rteApplicable ? (v.rteEntryClass ?? null) : null,
    rteExitClass: v.rteApplicable ? (v.rteExitClass ?? null) : null,
    stateBoardName: v.boardAffiliation === "STATE_BOARD" ? (v.stateBoardName ?? null) : null,
    streams: Array.from(new Set(v.streams)),
  }));

export const leadershipStepSchema = z.object({
  hosDesignation: requiredEnum(HOS_DESIGNATIONS, "the HOS designation"),
  hosName: requiredText("HOS / principal name", 2, 100),
  hosMobile: mobile("HOS mobile number"),
  hosEmail: requiredEmail("HOS official email"),
  managementName: requiredText("School owner / manager name", 2, 150),
  managementPhone: phone("Management contact phone"),
});

export const profileLockSchema = z.object({
  locked: z.boolean({ error: "locked must be true or false" }),
});

export const STEP_SCHEMAS = {
  identity: identityStepSchema,
  academic: academicStepSchema,
  leadership: leadershipStepSchema,
} as const;

export type IdentityStepInput = z.output<typeof identityStepSchema>;
export type AcademicStepInput = z.output<typeof academicStepSchema>;
export type LeadershipStepInput = z.output<typeof leadershipStepSchema>;

/** Field-keyed messages from a failed parse; first message per field wins. */
export function fieldErrorsFrom(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "_form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
