/**
 * Class & subject setup: builds the class structure from the Master School Profile, and
 * reads everything the Classes & Subjects screen shows per class and section.
 *
 * Every mutation goes through the existing class / section / subject services so their
 * prerequisites, uniqueness rules and audit events still apply.
 */
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import { BadRequestError, NotFoundError, PreconditionFailedError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import {
  classesForRange,
  defaultSubjectsFor,
  describeActiveRange,
  gradeOfClassName,
} from "@/modules/onboarding";
import {
  PLAN_FREQUENCIES,
  summarisePlan,
  type PlanFrequency,
} from "@/modules/fees/services/class-fee-plan-rules";
import { createAcademicYear, createClass, createSection, createSubject } from "./academics";

export const MEDIUM_VALUES = ["ENGLISH", "HINDI", "BILINGUAL", "URDU"] as const;
export type MediumValue = (typeof MEDIUM_VALUES)[number];

// ---------------------------------------------------------------------------
// Session helper
// ---------------------------------------------------------------------------

/** The April–March session that contains `today`, as Indian schools run it. */
export function currentIndianSession(today = new Date()) {
  const startYear = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
  const endShort = String((startYear + 1) % 100).padStart(2, "0");
  return {
    name: `${startYear}-${endShort}`,
    startDate: `${startYear}-04-01`,
    endDate: `${startYear + 1}-03-31`,
  };
}

// ---------------------------------------------------------------------------
// Provision from the school profile
// ---------------------------------------------------------------------------

export interface ProvisionClassStructureInput {
  schoolId: string;
  actorUserId?: string;
  classRange?: string | null;
  includesPrePrimary?: boolean;
  medium?: string | null;
  streams?: readonly string[];
}

export interface ProvisionClassStructureResult {
  /** The session created because the school had none (null when one already existed). */
  createdSession: string | null;
  createdClasses: string[];
  createdSections: number;
  createdSubjects: number;
  /** Classes already present that the selected range no longer covers; they are kept. */
  outsideRange: string[];
  /** Why nothing was created, when it could not be. */
  skippedReason: string | null;
}

/**
 * Creates the classes the profile's recognised range implies, each with Section A in the
 * school's medium and the default subjects for its level. Only adds: existing classes,
 * sections and subjects are never renamed or removed, so it is safe to run again.
 */
export async function provisionClassStructure(
  input: ProvisionClassStructureInput
): Promise<ProvisionClassStructureResult> {
  try {
    return await provisionClassStructureUnsafe(input);
  } catch (err) {
    // A missing prerequisite must not fail the profile save that triggered this; report it.
    if (err instanceof PreconditionFailedError) {
      logger.warn(
        { schoolId: input.schoolId, reason: err.message },
        "Class structure provisioning skipped"
      );
      return {
        createdSession: null,
        createdClasses: [],
        createdSections: 0,
        createdSubjects: 0,
        outsideRange: [],
        skippedReason: err.message,
      };
    }
    throw err;
  }
}

async function provisionClassStructureUnsafe(
  input: ProvisionClassStructureInput
): Promise<ProvisionClassStructureResult> {
  const { schoolId, actorUserId } = input;
  const result: ProvisionClassStructureResult = {
    createdSession: null,
    createdClasses: [],
    createdSections: 0,
    createdSubjects: 0,
    outsideRange: [],
    skippedReason: null,
  };

  const template = classesForRange(input.classRange, input.includesPrePrimary);
  if (template.length === 0) {
    result.skippedReason = "Select a recognised class range to create classes.";
    return result;
  }

  // Classes need an active session. A brand-new school gets the current April–March one;
  // a school that has sessions but none active must choose one itself.
  const current = await prisma.academicYear.findFirst({
    where: { schoolId, isCurrent: true },
    select: { id: true },
  });
  if (!current) {
    const anySession = await prisma.academicYear.count({ where: { schoolId } });
    if (anySession > 0) {
      result.skippedReason =
        "Activate an academic session in Academic Settings, then sync classes from the profile.";
      return result;
    }
    const session = currentIndianSession();
    await createAcademicYear(schoolId, { ...session, isCurrent: true }, actorUserId);
    result.createdSession = session.name;
  }

  const medium = MEDIUM_VALUES.includes(input.medium as MediumValue)
    ? (input.medium as MediumValue)
    : null;
  const streams = input.streams ?? [];

  const existing = await prisma.class.findMany({
    where: { schoolId },
    select: {
      id: true,
      name: true,
      _count: { select: { sections: true, subjects: true } },
    },
  });
  const byName = new Map(existing.map((c) => [c.name.trim().toLowerCase(), c]));
  const wanted = new Set(template.map((t) => t.name.toLowerCase()));
  result.outsideRange = existing
    .filter((c) => !wanted.has(c.name.trim().toLowerCase()) && gradeOfClassName(c.name) !== null)
    .map((c) => c.name);

  for (const t of template) {
    let cls = byName.get(t.name.toLowerCase());
    if (!cls) {
      const created = await createClass(
        schoolId,
        { name: t.name, numericOrder: t.numericOrder },
        actorUserId
      );
      cls = { id: created.id, name: created.name, _count: { sections: 0, subjects: 0 } };
      result.createdClasses.push(t.name);
    }

    if (cls._count.sections === 0) {
      await createSection(schoolId, { classId: cls.id, name: "A", medium }, actorUserId);
      result.createdSections++;
    }

    // Default subjects only for classes that have none, so a curated list is left alone.
    if (cls._count.subjects === 0) {
      for (const subject of defaultSubjectsFor(t.grade, streams)) {
        await createSubject(schoolId, { name: subject, code: null, classId: cls.id }, actorUserId);
        result.createdSubjects++;
      }
    }
  }

  await logAuditEvent({
    action: "CLASS_STRUCTURE_PROVISIONED",
    entityType: "School",
    entityId: schoolId,
    schoolId,
    userId: actorUserId,
    details: {
      classRange: input.classRange,
      includesPrePrimary: Boolean(input.includesPrePrimary),
      createdSession: result.createdSession,
      createdClasses: result.createdClasses,
      createdSections: result.createdSections,
      createdSubjects: result.createdSubjects,
    },
  });

  return result;
}

/** Re-runs provisioning from the saved school profile (the "Sync from profile" action). */
export async function provisionClassStructureFromProfile(schoolId: string, actorUserId?: string) {
  const profile = await prisma.schoolProfile.findUnique({
    where: { schoolId },
    select: {
      classRange: true,
      includesPrePrimary: true,
      instructionMedium: true,
      streams: true,
      academicCompletedAt: true,
    },
  });
  if (!profile?.academicCompletedAt || !profile.classRange) {
    throw new BadRequestError(
      "Save the Academic Setup step of the school profile before creating classes from it."
    );
  }
  return provisionClassStructure({
    schoolId,
    actorUserId,
    classRange: profile.classRange,
    includesPrePrimary: profile.includesPrePrimary,
    medium: profile.instructionMedium,
    streams: profile.streams,
  });
}

// ---------------------------------------------------------------------------
// Create a class with its sections and subjects in one step
// ---------------------------------------------------------------------------

export const createClassSetupSchema = z.object({
  name: z.string().trim().min(1, "Class name is required").max(50, "Class name too long"),
  numericOrder: z.number().int().min(0).max(1000).optional().nullable(),
  sections: z
    .array(z.string().trim().min(1).max(30))
    .max(26, "At most 26 sections at once")
    .default(["A"]),
  medium: z.enum(MEDIUM_VALUES).optional().nullable(),
  /** Add the default subjects for the class level (when the name is Nursery…Class 12). */
  applySubjectTemplate: z.boolean().default(true),
});

export async function createClassWithSetup(
  schoolId: string,
  rawInput: unknown,
  actorUserId?: string
) {
  const input = createClassSetupSchema.parse(rawInput);
  const cls = await createClass(
    schoolId,
    { name: input.name, numericOrder: input.numericOrder ?? null },
    actorUserId
  );

  const sectionNames = Array.from(new Set(input.sections.map((s) => s.toUpperCase())));
  for (const name of sectionNames) {
    await createSection(
      schoolId,
      { classId: cls.id, name, medium: input.medium ?? null },
      actorUserId
    );
  }

  let subjects = 0;
  const grade = gradeOfClassName(cls.name);
  if (input.applySubjectTemplate && grade !== null) {
    const profile = await prisma.schoolProfile.findUnique({
      where: { schoolId },
      select: { streams: true },
    });
    for (const name of defaultSubjectsFor(grade, profile?.streams ?? [])) {
      await createSubject(schoolId, { name, code: null, classId: cls.id }, actorUserId);
      subjects++;
    }
  }

  return { class: cls, sectionsCreated: sectionNames.length, subjectsCreated: subjects };
}

// ---------------------------------------------------------------------------
// Copy subjects between classes
// ---------------------------------------------------------------------------

export const copyClassSubjectsSchema = z.object({
  fromClassId: z.string().trim().min(1, "Source class is required"),
  toClassIds: z.array(z.string().trim().min(1)).min(1, "Choose at least one class to copy to"),
});

/** Copies the source class's subjects to other classes, skipping names they already have. */
export async function copyClassSubjects(schoolId: string, rawInput: unknown, actorUserId?: string) {
  const input = copyClassSubjectsSchema.parse(rawInput);
  const targets = input.toClassIds.filter((id) => id !== input.fromClassId);

  const source = await prisma.class.findFirst({
    where: { id: input.fromClassId, schoolId },
    select: { id: true, name: true, subjects: { select: { name: true, code: true } } },
  });
  if (!source) throw new NotFoundError("Source class not found in this school");
  if (source.subjects.length === 0) {
    throw new BadRequestError(`${source.name} has no subjects to copy`);
  }

  const targetClasses = await prisma.class.findMany({
    where: { id: { in: targets }, schoolId },
    select: { id: true, name: true, subjects: { select: { name: true } } },
  });
  if (targetClasses.length !== targets.length) {
    throw new NotFoundError("One or more target classes were not found in this school");
  }

  let copied = 0;
  for (const target of targetClasses) {
    const have = new Set(target.subjects.map((s) => s.name.trim().toLowerCase()));
    for (const subject of source.subjects) {
      if (have.has(subject.name.trim().toLowerCase())) continue;
      await createSubject(
        schoolId,
        { name: subject.name, code: subject.code, classId: target.id },
        actorUserId
      );
      copied++;
    }
  }

  return { copied, classes: targetClasses.map((c) => c.name) };
}

// ---------------------------------------------------------------------------
// Overview for the Classes & Subjects screen
// ---------------------------------------------------------------------------

export interface ClassSetupSection {
  id: string;
  name: string;
  capacity: number | null;
  medium: MediumValue | null;
  studentCount: number;
  classTeacher: string | null;
}

export interface ClassSetupExam {
  id: string;
  name: string;
  maxMarks: number | null;
  passMarks: number | null;
}

export interface ClassSetupRow {
  id: string;
  name: string;
  numericOrder: number | null;
  sections: ClassSetupSection[];
  subjects: { id: string; name: string; code: string | null }[];
  /** The class's fee plan for the active session (null when nothing is set). */
  fees: {
    monthlyFee: string | null;
    admissionFee: string | null;
    additional: { headName: string; amount: string; frequency: PlanFrequency }[];
    /** Structures on a custom schedule, managed in Fees management. */
    customStructures: number;
  } | null;
  exams: ClassSetupExam[];
  /** What still has to be set before the class counts as configured. */
  missing: ("sections" | "subjects" | "fees")[];
}

export interface ClassSetupOverview {
  /** False when the viewer may not see fee amounts; the fee column is then hidden. */
  includesFees: boolean;
  currentYear: { id: string; name: string; startDate: string; endDate: string } | null;
  defaultMedium: MediumValue | null;
  profile: {
    academicSaved: boolean;
    rangeLabel: string;
    /** Template classes the profile implies that do not exist yet. */
    missingClasses: string[];
  };
  rows: ClassSetupRow[];
  schoolWideSubjects: { id: string; name: string; code: string | null }[];
}

/**
 * @param includeFees pass `canViewSchoolFees(user, schoolId)`: fee amounts are left out
 *   (rows show `fees: null` and are not marked as missing fees) for viewers who may not see them.
 */
export async function getClassSetupOverview(
  schoolId: string,
  { includeFees }: { includeFees: boolean }
): Promise<ClassSetupOverview> {
  const [currentYear, profile, classes, schoolWideSubjects] = await Promise.all([
    prisma.academicYear.findFirst({
      where: { schoolId, isCurrent: true },
      select: { id: true, name: true, startDate: true, endDate: true },
    }),
    prisma.schoolProfile.findUnique({
      where: { schoolId },
      select: {
        instructionMedium: true,
        classRange: true,
        includesPrePrimary: true,
        academicCompletedAt: true,
      },
    }),
    prisma.class.findMany({
      where: { schoolId },
      orderBy: [{ numericOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        numericOrder: true,
        sections: {
          orderBy: { name: "asc" },
          select: { id: true, name: true, capacity: true, medium: true },
        },
        subjects: { orderBy: { name: "asc" }, select: { id: true, name: true, code: true } },
      },
    }),
    prisma.subject.findMany({
      where: { schoolId, classId: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true, code: true },
    }),
  ]);

  const yearId = currentYear?.id;
  const [enrollmentCounts, teachers, structures, examConfigs, examClasses] = yearId
    ? await Promise.all([
        prisma.enrollment.groupBy({
          by: ["sectionId"],
          where: { schoolId, academicYearId: yearId, status: "ACTIVE" },
          _count: { _all: true },
        }),
        prisma.classTeacherAssignment.findMany({
          where: { schoolId, academicYearId: yearId, status: "ACTIVE" },
          select: { sectionId: true, teacher: { select: { user: { select: { name: true } } } } },
        }),
        prisma.feeStructure.findMany({
          where: includeFees
            ? { schoolId, academicYearId: yearId, isActive: true, classId: { not: null } }
            : { id: { in: [] } },
          orderBy: { createdAt: "asc" },
          select: {
            classId: true,
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
        }),
        prisma.examSubjectConfig.groupBy({
          by: ["examId", "classId"],
          where: { schoolId, exam: { academicYearId: yearId } },
          _max: { maxMarks: true, passMarks: true },
        }),
        prisma.examClass.findMany({
          where: { schoolId, exam: { academicYearId: yearId } },
          select: { classId: true, exam: { select: { id: true, name: true, startDate: true } } },
          orderBy: { exam: { startDate: "asc" } },
        }),
      ])
    : [[], [], [], [], []];

  const students = new Map(enrollmentCounts.map((e) => [e.sectionId, e._count._all]));
  const teacherOf = new Map(teachers.map((t) => [t.sectionId, t.teacher.user.name]));
  const marks = new Map(examConfigs.map((c) => [`${c.examId}:${c.classId}`, c._max]));

  const rows: ClassSetupRow[] = classes.map((cls) => {
    const classStructures = structures.filter((s) => s.classId === cls.id);
    const plan = summarisePlan(
      classStructures
        .filter((st) => (PLAN_FREQUENCIES as readonly string[]).includes(st.frequency))
        .flatMap((st) =>
          st.items.map((i) => ({
            feeHeadId: i.feeHeadId,
            headName: i.feeHead.name,
            headCode: i.feeHead.code,
            amount: i.amount.toString(),
            frequency: st.frequency as PlanFrequency,
          }))
        )
    );
    const customStructures = classStructures.filter((st) => st.frequency === "CUSTOM").length;

    const sections = cls.sections.map((s) => ({
      id: s.id,
      name: s.name,
      capacity: s.capacity,
      medium: s.medium as MediumValue | null,
      studentCount: students.get(s.id) ?? 0,
      classTeacher: teacherOf.get(s.id) ?? null,
    }));

    const exams = examClasses
      .filter((e) => e.classId === cls.id)
      .map(({ exam }) => {
        const m = marks.get(`${exam.id}:${cls.id}`);
        return {
          id: exam.id,
          name: exam.name,
          maxMarks: m?.maxMarks ?? null,
          passMarks: m?.passMarks ?? null,
        };
      });

    const missing: ClassSetupRow["missing"] = [];
    if (sections.length === 0) missing.push("sections");
    if (cls.subjects.length === 0) missing.push("subjects");
    if (includeFees && classStructures.length === 0) missing.push("fees");

    return {
      id: cls.id,
      name: cls.name,
      numericOrder: cls.numericOrder,
      sections,
      subjects: cls.subjects,
      fees: classStructures.length
        ? {
            monthlyFee: plan.monthlyFee,
            admissionFee: plan.admissionFee,
            additional: plan.additional.map(({ headName, amount, frequency }) => ({
              headName,
              amount,
              frequency,
            })),
            customStructures,
          }
        : null,
      exams,
      missing,
    };
  });

  const existingNames = new Set(classes.map((c) => c.name.trim().toLowerCase()));
  const academicSaved = Boolean(profile?.academicCompletedAt && profile.classRange);

  return {
    includesFees: includeFees,
    currentYear: currentYear
      ? {
          id: currentYear.id,
          name: currentYear.name,
          startDate: currentYear.startDate.toISOString(),
          endDate: currentYear.endDate.toISOString(),
        }
      : null,
    defaultMedium: (profile?.instructionMedium as MediumValue | null) ?? null,
    profile: {
      academicSaved,
      rangeLabel: academicSaved
        ? describeActiveRange(profile?.classRange, profile?.includesPrePrimary)
        : "",
      missingClasses: academicSaved
        ? classesForRange(profile?.classRange, profile?.includesPrePrimary)
            .map((t) => t.name)
            .filter((n) => !existingNames.has(n.toLowerCase()))
        : [],
    },
    rows,
    schoolWideSubjects,
  };
}
