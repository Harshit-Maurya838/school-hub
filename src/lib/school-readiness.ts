import { prisma } from "./prisma";
import { PreconditionFailedError } from "./errors";

export interface SchoolDetailsReadiness {
  isReady: boolean;
  name: string;
  code: string;
  slug: string;
  isActive: boolean;
  status: string;
  hasActiveAdmin: boolean;
  isRegistrationApproved: boolean;
  missingFields: string[];
  reason?: string;
  admin?: {
    id: string;
    name: string;
    email: string | null;
  } | null;
}

export type PrerequisiteStepStatus = "COMPLETE" | "PENDING" | "BLOCKED";

export interface PrerequisiteStep {
  id: "schoolDetails" | "academicYear" | "classes" | "sections" | "subjects";
  title: string;
  status: PrerequisiteStepStatus;
  isComplete: boolean;
  isBlocked: boolean;
  message: string;
  actionUrl: string;
  actionLabel: string;
}

export interface AcademicSetupReadiness {
  schoolId: string;
  schoolSlug: string;
  schoolDetails: SchoolDetailsReadiness;
  steps: {
    schoolDetails: PrerequisiteStep;
    academicYear: PrerequisiteStep;
    classes: PrerequisiteStep;
    sections: PrerequisiteStep;
    subjects: PrerequisiteStep;
  };
  summary: {
    canConfigureAcademicYears: boolean;
    canCreateClasses: boolean;
    canCreateSections: boolean;
    canCreateSubjects: boolean;
    currentAcademicYear: {
      id: string;
      name: string;
      startDate: Date;
      endDate: Date;
      isCurrent: boolean;
    } | null;
    counts: {
      years: number;
      classes: number;
      sections: number;
      subjects: number;
    };
  };
}

/**
 * Centrally evaluates school profile completeness and activation status.
 * Reuses existing schema fields and registration requirements without arbitrary flags.
 */
export async function getSchoolDetailsReadiness(schoolId: string): Promise<SchoolDetailsReadiness> {
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    include: {
      users: {
        where: {
          role: "SCHOOL_ADMIN",
          isActive: true,
          deletedAt: null,
        },
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      registrations: {
        select: {
          id: true,
          status: true,
        },
      },
    },
  });

  if (!school) {
    return {
      isReady: false,
      name: "",
      code: "",
      slug: "",
      isActive: false,
      status: "NOT_FOUND",
      hasActiveAdmin: false,
      isRegistrationApproved: false,
      missingFields: ["school"],
      reason: "School tenant not found",
      admin: null,
    };
  }

  const missingFields: string[] = [];

  const trimmedName = school.name ? school.name.trim() : "";
  if (trimmedName.length < 2) {
    missingFields.push("schoolName");
  }

  const trimmedCode = school.code ? school.code.trim() : "";
  if (trimmedCode.length < 2) {
    missingFields.push("schoolCode");
  }

  const trimmedSlug = school.slug ? school.slug.trim() : "";
  if (trimmedSlug.length < 2) {
    missingFields.push("schoolSlug");
  }

  const activeAdmin = school.users.find(
    (u) => u.name && u.name.trim().length >= 2 && Boolean(u.email)
  );
  if (!activeAdmin) {
    missingFields.push("schoolAdmin");
  }

  // Registration lifecycle check:
  // If registrations exist, all linked registrations must be approved (none pending or rejected)
  let isRegistrationApproved = true;
  if (school.registrations.length > 0) {
    const hasUnapproved = school.registrations.some((r) => r.status !== "APPROVED");
    if (hasUnapproved) {
      isRegistrationApproved = false;
      missingFields.push("registrationApproval");
    }
  }

  let reason: string | undefined;

  if (school.status !== "ACTIVE") {
    reason = `School lifecycle status is ${school.status}. School must be ACTIVE before configuring academics.`;
  } else if (!school.isActive) {
    reason = "School tenant account is currently deactivated.";
  } else if (!isRegistrationApproved) {
    reason = "School registration application is pending approval or has been rejected.";
  } else if (missingFields.length > 0) {
    const fieldDescriptions: Record<string, string> = {
      schoolName: "valid school name (minimum 2 characters)",
      schoolCode: "valid school code (minimum 2 characters)",
      schoolSlug: "valid URL slug (minimum 2 characters)",
      schoolAdmin: "active assigned school administrator with valid name and email",
      registrationApproval: "approved registration application",
    };
    const missingDesc = missingFields.map((f) => fieldDescriptions[f] || f).join(", ");
    reason = `Complete your school profile before configuring the academic year. Missing or incomplete: ${missingDesc}.`;
  }

  const isReady =
    missingFields.length === 0 &&
    school.isActive === true &&
    school.status === "ACTIVE" &&
    isRegistrationApproved;

  return {
    isReady,
    name: school.name,
    code: school.code,
    slug: school.slug,
    isActive: school.isActive,
    status: school.status,
    hasActiveAdmin: Boolean(activeAdmin),
    isRegistrationApproved,
    missingFields,
    reason,
    admin: activeAdmin
      ? { id: activeAdmin.id, name: activeAdmin.name, email: activeAdmin.email }
      : null,
  };
}

/**
 * Returns full dependency-aware academic setup readiness assessment for UI and API.
 */
export async function getAcademicSetupReadiness(
  schoolId: string,
  schoolSlug?: string
): Promise<AcademicSetupReadiness> {
  const [schoolDetails, years, classesCount, sectionsCount, subjectsCount] = await Promise.all([
    getSchoolDetailsReadiness(schoolId),
    prisma.academicYear.findMany({
      where: { schoolId },
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
        isCurrent: true,
      },
      orderBy: [{ isCurrent: "desc" }, { startDate: "desc" }],
    }),
    prisma.class.count({ where: { schoolId } }),
    prisma.section.count({ where: { schoolId } }),
    prisma.subject.count({ where: { schoolId } }),
  ]);

  const slug = schoolSlug || schoolDetails.slug || schoolId;
  const currentYear = years.find((y) => y.isCurrent) || null;
  const hasCurrentYear = Boolean(currentYear);

  // Step 1: School Details
  const schoolDetailsStep: PrerequisiteStep = {
    id: "schoolDetails",
    title: "1. School Details & Activation",
    status: schoolDetails.isReady ? "COMPLETE" : "PENDING",
    isComplete: schoolDetails.isReady,
    isBlocked: false,
    message: schoolDetails.isReady
      ? `Active & Verified (${schoolDetails.name})`
      : schoolDetails.reason || "Complete required school profile details",
    actionUrl: `/school/${slug}/settings`,
    actionLabel: schoolDetails.isReady ? "View Profile" : "Complete Profile",
  };

  // Step 2: Academic Year Configuration
  let academicYearStep: PrerequisiteStep;
  if (!schoolDetails.isReady) {
    academicYearStep = {
      id: "academicYear",
      title: "2. Academic Session",
      status: "BLOCKED",
      isComplete: false,
      isBlocked: true,
      message: "Complete your school profile before configuring the academic year.",
      actionUrl: `/school/${slug}/settings`,
      actionLabel: "Complete Profile First",
    };
  } else if (hasCurrentYear) {
    academicYearStep = {
      id: "academicYear",
      title: "2. Academic Session",
      status: "COMPLETE",
      isComplete: true,
      isBlocked: false,
      message: `Active Session: ${currentYear!.name}`,
      actionUrl: `/school/${slug}/academics/sessions`,
      actionLabel: "Manage Sessions",
    };
  } else {
    academicYearStep = {
      id: "academicYear",
      title: "2. Academic Session",
      status: "PENDING",
      isComplete: false,
      isBlocked: false,
      message:
        years.length > 0
          ? `${years.length} session(s) defined, but none is marked current. Mark a current year.`
          : "No active academic session configured. Create and activate a session.",
      actionUrl: `/school/${slug}/academics/sessions`,
      actionLabel: years.length > 0 ? "Set Current Session" : "Create Session",
    };
  }

  // Step 3: Classes
  let classesStep: PrerequisiteStep;
  if (!schoolDetails.isReady) {
    classesStep = {
      id: "classes",
      title: "3. Grade Levels / Classes",
      status: "BLOCKED",
      isComplete: false,
      isBlocked: true,
      message: "Complete your school profile before configuring classes.",
      actionUrl: `/school/${slug}/settings`,
      actionLabel: "Complete Profile First",
    };
  } else if (!hasCurrentYear) {
    classesStep = {
      id: "classes",
      title: "3. Grade Levels / Classes",
      status: "BLOCKED",
      isComplete: false,
      isBlocked: true,
      message: "Set up and activate an academic year before creating classes.",
      actionUrl: `/school/${slug}/academics/sessions`,
      actionLabel: "Configure Academic Year First",
    };
  } else if (classesCount > 0) {
    classesStep = {
      id: "classes",
      title: "3. Grade Levels / Classes",
      status: "COMPLETE",
      isComplete: true,
      isBlocked: false,
      message: `${classesCount} class(es) defined`,
      actionUrl: `/school/${slug}/academics/classes`,
      actionLabel: "Manage Classes",
    };
  } else {
    classesStep = {
      id: "classes",
      title: "3. Grade Levels / Classes",
      status: "PENDING",
      isComplete: false,
      isBlocked: false,
      message: "No classes created yet. Add grade levels.",
      actionUrl: `/school/${slug}/academics/classes`,
      actionLabel: "Create Class",
    };
  }

  // Step 4: Sections
  let sectionsStep: PrerequisiteStep;
  if (!schoolDetails.isReady) {
    sectionsStep = {
      id: "sections",
      title: "4. Class Sections",
      status: "BLOCKED",
      isComplete: false,
      isBlocked: true,
      message: "Complete your school profile before configuring sections.",
      actionUrl: `/school/${slug}/settings`,
      actionLabel: "Complete Profile First",
    };
  } else if (!hasCurrentYear) {
    sectionsStep = {
      id: "sections",
      title: "4. Class Sections",
      status: "BLOCKED",
      isComplete: false,
      isBlocked: true,
      message: "Set up and activate an academic year before creating sections.",
      actionUrl: `/school/${slug}/academics/sessions`,
      actionLabel: "Configure Academic Year First",
    };
  } else if (classesCount === 0) {
    sectionsStep = {
      id: "sections",
      title: "4. Class Sections",
      status: "BLOCKED",
      isComplete: false,
      isBlocked: true,
      message: "Create at least one class before creating sections.",
      actionUrl: `/school/${slug}/academics/classes`,
      actionLabel: "Create Class First",
    };
  } else if (sectionsCount > 0) {
    sectionsStep = {
      id: "sections",
      title: "4. Class Sections",
      status: "COMPLETE",
      isComplete: true,
      isBlocked: false,
      message: `${sectionsCount} section(s) defined`,
      actionUrl: `/school/${slug}/academics/sections`,
      actionLabel: "Manage Sections",
    };
  } else {
    sectionsStep = {
      id: "sections",
      title: "4. Class Sections",
      status: "PENDING",
      isComplete: false,
      isBlocked: false,
      message: "No sections created yet. Add divisions under classes.",
      actionUrl: `/school/${slug}/academics/sections`,
      actionLabel: "Create Section",
    };
  }

  // Step 5: Subjects
  let subjectsStep: PrerequisiteStep;
  if (!schoolDetails.isReady) {
    subjectsStep = {
      id: "subjects",
      title: "5. Curriculum Subjects",
      status: "BLOCKED",
      isComplete: false,
      isBlocked: true,
      message: "Complete your school profile before configuring subjects.",
      actionUrl: `/school/${slug}/settings`,
      actionLabel: "Complete Profile First",
    };
  } else if (!hasCurrentYear) {
    subjectsStep = {
      id: "subjects",
      title: "5. Curriculum Subjects",
      status: "BLOCKED",
      isComplete: false,
      isBlocked: true,
      message: "Set up and activate an academic year before creating subjects.",
      actionUrl: `/school/${slug}/academics/sessions`,
      actionLabel: "Configure Academic Year First",
    };
  } else if (subjectsCount > 0) {
    subjectsStep = {
      id: "subjects",
      title: "5. Curriculum Subjects",
      status: "COMPLETE",
      isComplete: true,
      isBlocked: false,
      message: `${subjectsCount} subject(s) cataloged`,
      actionUrl: `/school/${slug}/academics/subjects`,
      actionLabel: "Manage Subjects",
    };
  } else {
    subjectsStep = {
      id: "subjects",
      title: "5. Curriculum Subjects",
      status: "PENDING",
      isComplete: false,
      isBlocked: false,
      message: "No subjects defined yet. Add courses to catalog.",
      actionUrl: `/school/${slug}/academics/subjects`,
      actionLabel: "Create Subject",
    };
  }

  return {
    schoolId,
    schoolSlug: slug,
    schoolDetails,
    steps: {
      schoolDetails: schoolDetailsStep,
      academicYear: academicYearStep,
      classes: classesStep,
      sections: sectionsStep,
      subjects: subjectsStep,
    },
    summary: {
      canConfigureAcademicYears: schoolDetails.isReady,
      canCreateClasses: schoolDetails.isReady && hasCurrentYear,
      canCreateSections: schoolDetails.isReady && hasCurrentYear && classesCount > 0,
      canCreateSubjects: schoolDetails.isReady && hasCurrentYear,
      currentAcademicYear: currentYear,
      counts: {
        years: years.length,
        classes: classesCount,
        sections: sectionsCount,
        subjects: subjectsCount,
      },
    },
  };
}

/**
 * Server-side guard: Asserts that school details are complete and the school is active.
 * Throws PreconditionFailedError (HTTP 400) if incomplete.
 */
export async function assertSchoolDetailsComplete(
  schoolId: string
): Promise<SchoolDetailsReadiness> {
  const readiness = await getSchoolDetailsReadiness(schoolId);
  if (!readiness.isReady) {
    throw new PreconditionFailedError(
      readiness.reason || "Complete your school profile before configuring the academic year.",
      {
        prerequisite: "SCHOOL_DETAILS_REQUIRED",
        missingFields: readiness.missingFields,
      }
    );
  }
  return readiness;
}

/**
 * Server-side guard: Asserts that school is ready to mutate academic years.
 */
export async function assertCanMutateAcademicYear(schoolId: string): Promise<void> {
  await assertSchoolDetailsComplete(schoolId);
}

/**
 * Server-side guard: Asserts that school details are complete AND a current academic year exists.
 */
export async function assertCanMutateClass(schoolId: string): Promise<void> {
  await assertSchoolDetailsComplete(schoolId);

  const currentYear = await prisma.academicYear.findFirst({
    where: { schoolId, isCurrent: true },
    select: { id: true, name: true },
  });

  if (!currentYear) {
    const anyYear = await prisma.academicYear.findFirst({
      where: { schoolId },
      select: { id: true },
    });

    if (!anyYear) {
      throw new PreconditionFailedError(
        "Set up and activate an academic year before creating classes.",
        {
          prerequisite: "ACADEMIC_YEAR_REQUIRED",
          actionUrl: "sessions",
        }
      );
    }

    throw new PreconditionFailedError(
      "Set up and activate an academic year before creating classes.",
      {
        prerequisite: "CURRENT_ACADEMIC_YEAR_REQUIRED",
        actionUrl: "sessions",
      }
    );
  }
}

/**
 * Server-side guard: Asserts prerequisites for sections:
 * 1. School details complete & active.
 * 2. Current academic year active.
 * 3. Parent class exists and belongs to this school tenant.
 */
export async function assertCanMutateSection(
  schoolId: string,
  classId: string
): Promise<{ id: string; name: string }> {
  await assertCanMutateClass(schoolId);

  if (!classId || typeof classId !== "string" || classId.trim() === "") {
    throw new PreconditionFailedError("Parent class is required before creating a section.", {
      prerequisite: "PARENT_CLASS_REQUIRED",
    });
  }

  const parentClass = await prisma.class.findFirst({
    where: { id: classId.trim(), schoolId },
    select: { id: true, name: true },
  });

  if (!parentClass) {
    // Check if the class belongs to another school (cross-tenant attack or bug)
    const foreignClass = await prisma.class.findUnique({
      where: { id: classId.trim() },
      select: { id: true },
    });

    if (foreignClass) {
      throw new PreconditionFailedError(
        "Parent class does not belong to this school. Cross-tenant class assignment rejected.",
        { prerequisite: "CROSS_TENANT_CLASS_REJECTED" }
      );
    }

    throw new PreconditionFailedError(
      "Parent class does not exist in this school. Create the class first.",
      { prerequisite: "PARENT_CLASS_NOT_FOUND" }
    );
  }

  return parentClass;
}

/**
 * Server-side guard: Asserts prerequisites for subjects:
 * 1. School details complete & active.
 * 2. Current academic year active.
 * 3. If class-specific (classId provided): parent class must exist and belong to this school tenant.
 */
export async function assertCanMutateSubject(
  schoolId: string,
  classId?: string | null
): Promise<void> {
  await assertCanMutateClass(schoolId);

  if (classId && typeof classId === "string" && classId.trim() !== "") {
    const parentClass = await prisma.class.findFirst({
      where: { id: classId.trim(), schoolId },
      select: { id: true, name: true },
    });

    if (!parentClass) {
      const foreignClass = await prisma.class.findUnique({
        where: { id: classId.trim() },
        select: { id: true },
      });

      if (foreignClass) {
        throw new PreconditionFailedError(
          "Selected class does not belong to this school. Cross-tenant class assignment rejected.",
          { prerequisite: "CROSS_TENANT_CLASS_REJECTED" }
        );
      }

      throw new PreconditionFailedError("Selected class does not exist in this school.", {
        prerequisite: "CLASS_NOT_FOUND",
      });
    }
  }
}

/**
 * Server-side guard: Asserts prerequisites for student admission:
 * 1. School details complete & active.
 * 2. Active current academic year configured.
 */
export async function assertCanAdmitStudent(
  schoolId: string
): Promise<{ id: string; name: string; startDate: Date; endDate: Date }> {
  await assertSchoolDetailsComplete(schoolId);

  const currentYear = await prisma.academicYear.findFirst({
    where: { schoolId, isCurrent: true },
    select: { id: true, name: true, startDate: true, endDate: true },
  });

  if (!currentYear) {
    throw new PreconditionFailedError(
      "A current academic year is required for student enrollment. Please configure an active academic session.",
      {
        prerequisite: "CURRENT_ACADEMIC_YEAR_REQUIRED",
        actionUrl: "sessions",
      }
    );
  }

  return currentYear;
}

/**
 * Server-side guard: Validates class and section ownership and association:
 * 1. Class exists and belongs to this school tenant (rejects cross-tenant class).
 * 2. Section exists and belongs to this school tenant (rejects cross-tenant section).
 * 3. Section belongs to the specified class (rejects mismatch).
 */
export async function assertClassAndSectionForSchool(
  schoolId: string,
  classId: string,
  sectionId: string
): Promise<{
  classRecord: { id: string; name: string };
  sectionRecord: { id: string; name: string; capacity: number | null; classId: string };
}> {
  if (!classId || typeof classId !== "string" || classId.trim() === "") {
    throw new PreconditionFailedError("Class is required for student enrollment.", {
      prerequisite: "CLASS_REQUIRED",
    });
  }

  if (!sectionId || typeof sectionId !== "string" || sectionId.trim() === "") {
    throw new PreconditionFailedError("Section is required for student enrollment.", {
      prerequisite: "SECTION_REQUIRED",
    });
  }

  const cleanClassId = classId.trim();
  const cleanSectionId = sectionId.trim();

  // 1. Verify Class
  const classRecord = await prisma.class.findFirst({
    where: { id: cleanClassId, schoolId },
    select: { id: true, name: true },
  });

  if (!classRecord) {
    const foreignClass = await prisma.class.findUnique({
      where: { id: cleanClassId },
      select: { id: true },
    });

    if (foreignClass) {
      throw new PreconditionFailedError(
        "Selected class does not belong to this school. Cross-tenant class assignment rejected.",
        { prerequisite: "CROSS_TENANT_CLASS_REJECTED" }
      );
    }

    throw new PreconditionFailedError("Selected class does not exist in this school.", {
      prerequisite: "CLASS_NOT_FOUND",
    });
  }

  // 2. Verify Section
  const sectionRecord = await prisma.section.findFirst({
    where: { id: cleanSectionId, schoolId },
    select: { id: true, name: true, capacity: true, classId: true },
  });

  if (!sectionRecord) {
    const foreignSection = await prisma.section.findUnique({
      where: { id: cleanSectionId },
      select: { id: true },
    });

    if (foreignSection) {
      throw new PreconditionFailedError(
        "Selected section does not belong to this school. Cross-tenant section assignment rejected.",
        { prerequisite: "CROSS_TENANT_SECTION_REJECTED" }
      );
    }

    throw new PreconditionFailedError("Selected section does not exist in this school.", {
      prerequisite: "SECTION_NOT_FOUND",
    });
  }

  // 3. Verify section belongs to class
  if (sectionRecord.classId !== classRecord.id) {
    throw new PreconditionFailedError(
      `Selected section '${sectionRecord.name}' does not belong to class '${classRecord.name}'.`,
      { prerequisite: "SECTION_CLASS_MISMATCH" }
    );
  }

  return { classRecord, sectionRecord };
}
