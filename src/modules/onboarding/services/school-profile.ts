/**
 * Master School Profile service: UDISE+ identity, academic setup and head-of-school
 * details, saved step by step and lockable once complete.
 */
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  PreconditionFailedError,
} from "@/lib/errors";
import type { AuthenticatedUser } from "@/modules/auth";
import {
  PROFILE_STEPS,
  STEP_SCHEMAS,
  profileLockSchema,
  type OtherLeader,
  type ProfileStep,
} from "./school-profile-rules";

export interface SchoolProfileView {
  school: { id: string; name: string; code: string; slug: string };
  identity: {
    name: string;
    udiseCode: string;
    establishmentYear: number | null;
    recognitionNumber: string;
    officialEmail: string;
    contactMobile: string;
    postalAddress: string;
  };
  academic: {
    instructionMedium: string | null;
    classRange: string | null;
    includesPrePrimary: boolean;
    rteApplicable: boolean;
    rteEntryClass: string | null;
    rteExitClass: string | null;
    boardAffiliation: string | null;
    stateBoardName: string;
    streams: string[];
  };
  leadership: {
    hosDesignation: string | null;
    hosName: string;
    hosMobile: string;
    hosEmail: string;
    managementName: string;
    managementPhone: string;
    otherLeaders: OtherLeader[];
  };
  completion: Record<ProfileStep, boolean>;
  isComplete: boolean;
  lock: {
    isLocked: boolean;
    lockedAt: string | null;
    lockedByName: string | null;
  };
  updatedAt: string | null;
}

const STEP_COMPLETED_FIELD = {
  identity: "identityCompletedAt",
  academic: "academicCompletedAt",
  leadership: "leadershipCompletedAt",
} as const;

const STEP_FIELDS: Record<ProfileStep, readonly string[]> = {
  identity: [
    "udiseCode",
    "establishmentYear",
    "recognitionNumber",
    "officialEmail",
    "contactMobile",
    "postalAddress",
  ],
  academic: [
    "instructionMedium",
    "classRange",
    "includesPrePrimary",
    "rteApplicable",
    "rteEntryClass",
    "rteExitClass",
    "boardAffiliation",
    "stateBoardName",
    "streams",
  ],
  leadership: [
    "hosDesignation",
    "hosName",
    "hosMobile",
    "hosEmail",
    "managementName",
    "managementPhone",
    "otherLeaders",
  ],
};

export function isProfileStep(value: unknown): value is ProfileStep {
  return typeof value === "string" && (PROFILE_STEPS as readonly string[]).includes(value);
}

/** Lock and unlock are allowed for this school's admin and for the platform super admin. */
export function assertCanLockSchoolProfile(user: AuthenticatedUser, schoolId: string) {
  const isOwnAdmin = user.role === "SCHOOL_ADMIN" && user.schoolId === schoolId;
  if (!isOwnAdmin && user.role !== "SUPER_ADMIN") {
    throw new ForbiddenError("Only school administrators can lock or unlock the school profile");
  }
}

export async function getSchoolProfile(schoolId: string): Promise<SchoolProfileView> {
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: {
      id: true,
      name: true,
      code: true,
      slug: true,
      profile: { include: { lockedBy: { select: { name: true } } } },
    },
  });

  if (!school) {
    throw new NotFoundError("School not found");
  }

  const p = school.profile;
  const completion = {
    identity: Boolean(p?.identityCompletedAt),
    academic: Boolean(p?.academicCompletedAt),
    leadership: Boolean(p?.leadershipCompletedAt),
  };

  return {
    school: { id: school.id, name: school.name, code: school.code, slug: school.slug },
    identity: {
      name: school.name,
      udiseCode: p?.udiseCode ?? "",
      establishmentYear: p?.establishmentYear ?? null,
      recognitionNumber: p?.recognitionNumber ?? "",
      officialEmail: p?.officialEmail ?? "",
      contactMobile: p?.contactMobile ?? "",
      postalAddress: p?.postalAddress ?? "",
    },
    academic: {
      instructionMedium: p?.instructionMedium ?? null,
      classRange: p?.classRange ?? null,
      includesPrePrimary: p?.includesPrePrimary ?? false,
      rteApplicable: p?.rteApplicable ?? false,
      rteEntryClass: p?.rteEntryClass ?? null,
      rteExitClass: p?.rteExitClass ?? null,
      boardAffiliation: p?.boardAffiliation ?? null,
      stateBoardName: p?.stateBoardName ?? "",
      streams: p?.streams ?? [],
    },
    leadership: {
      hosDesignation: p?.hosDesignation ?? null,
      hosName: p?.hosName ?? "",
      hosMobile: p?.hosMobile ?? "",
      hosEmail: p?.hosEmail ?? "",
      managementName: p?.managementName ?? "",
      managementPhone: p?.managementPhone ?? "",
      otherLeaders: (p?.otherLeaders as OtherLeader[] | undefined) ?? [],
    },
    completion,
    isComplete: completion.identity && completion.academic && completion.leadership,
    lock: {
      isLocked: p?.isLocked ?? false,
      lockedAt: p?.lockedAt?.toISOString() ?? null,
      lockedByName: p?.lockedBy?.name ?? null,
    },
    updatedAt: p?.updatedAt?.toISOString() ?? null,
  };
}

export async function saveSchoolProfileStep(params: {
  schoolId: string;
  actorUserId: string;
  step: ProfileStep;
  input: unknown;
}): Promise<SchoolProfileView> {
  const { schoolId, actorUserId, step } = params;
  const parsed = STEP_SCHEMAS[step].parse(params.input) as Record<string, unknown>;

  const changedFields = await prisma.$transaction(async (tx) => {
    const existing = await tx.schoolProfile.findUnique({ where: { schoolId } });
    if (existing?.isLocked) {
      throw new ConflictError(
        "The school profile is locked. Unlock it before making changes.",
        undefined,
        "SCHOOL_PROFILE_LOCKED"
      );
    }

    if (step === "identity") {
      const udiseOwner = await tx.schoolProfile.findFirst({
        where: { udiseCode: parsed.udiseCode as string, NOT: { schoolId } },
        select: { id: true },
      });
      if (udiseOwner) {
        throw new ConflictError("This U-DISE code is already registered to another school");
      }
    }

    const data: Record<string, unknown> = {};
    for (const field of STEP_FIELDS[step]) {
      data[field] = parsed[field] ?? null;
    }
    data[STEP_COMPLETED_FIELD[step]] = new Date();

    const changed = STEP_FIELDS[step].filter((field) => {
      const before = existing ? (existing as Record<string, unknown>)[field] : undefined;
      return JSON.stringify(before ?? null) !== JSON.stringify(data[field] ?? null);
    });

    if (step === "identity") {
      const school = await tx.school.findFirst({
        where: { id: schoolId },
        select: { name: true },
      });
      if (!school) throw new NotFoundError("School not found");
      if (school.name !== parsed.name) {
        await tx.school.update({ where: { id: schoolId }, data: { name: parsed.name as string } });
        changed.unshift("name");
      }
    }

    await tx.schoolProfile.upsert({
      where: { schoolId },
      create: { schoolId, ...data },
      update: data,
    });

    return changed;
  });

  await logAuditEvent({
    action: "SCHOOL_PROFILE_UPDATED",
    entityType: "SchoolProfile",
    entityId: schoolId,
    schoolId,
    userId: actorUserId,
    details: { step, changedFields },
  });

  return getSchoolProfile(schoolId);
}

export async function setSchoolProfileLock(params: {
  schoolId: string;
  actorUserId: string;
  input: unknown;
}): Promise<SchoolProfileView> {
  const { schoolId, actorUserId } = params;
  const { locked } = profileLockSchema.parse(params.input);

  const changed = await prisma.$transaction(async (tx) => {
    const profile = await tx.schoolProfile.findUnique({ where: { schoolId } });

    if (locked) {
      const complete =
        profile?.identityCompletedAt &&
        profile.academicCompletedAt &&
        profile.leadershipCompletedAt;
      if (!complete) {
        throw new PreconditionFailedError(
          "Complete and save all three steps before locking the school profile"
        );
      }
    }

    if (!profile || profile.isLocked === locked) {
      return false;
    }

    await tx.schoolProfile.update({
      where: { schoolId },
      data: locked
        ? { isLocked: true, lockedAt: new Date(), lockedById: actorUserId }
        : { isLocked: false, lockedAt: null, lockedById: null },
    });
    return true;
  });

  if (changed) {
    await logAuditEvent({
      action: locked ? "SCHOOL_PROFILE_LOCKED" : "SCHOOL_PROFILE_UNLOCKED",
      entityType: "SchoolProfile",
      entityId: schoolId,
      schoolId,
      userId: actorUserId,
    });
  }

  return getSchoolProfile(schoolId);
}
