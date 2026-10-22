import { prisma } from "@/lib/prisma";
import { EmploymentStatus } from "@/generated/prisma/enums";
import { NotFoundError, ConflictError, ForbiddenError } from "@/lib/errors";
import { logAuditEvent } from "@/lib/audit";

export interface TeacherListItem {
  id: string; // teacherProfileId
  userId: string;
  name: string;
  email: string | null;
  phone: string | null;
  employeeId: string | null;
  qualification: string | null;
  specialization: string | null;
  designation: string | null;
  department: string | null;
  status: EmploymentStatus;
  isActive: boolean;
  joiningDate: string | null;
  classTeacherFor: {
    classId: string;
    className: string;
    sectionId: string;
    sectionName: string;
  } | null;
  subjectsCount: number;
  sectionsCount: number;
  workloadStatus: "LOW" | "NORMAL" | "HIGH";
}

export interface TeacherDetail {
  id: string;
  userId: string;
  name: string;
  email: string | null;
  phone: string | null;
  employeeId: string | null;
  qualification: string | null;
  specialization: string | null;
  designation: string | null;
  department: string | null;
  status: EmploymentStatus;
  isActive: boolean;
  joiningDate: string | null;
  currentAssignments: {
    academicYear: {
      id: string;
      name: string;
      isCurrent: boolean;
    } | null;
    classTeacherAssignment: {
      id: string;
      classId: string;
      className: string;
      sectionId: string;
      sectionName: string;
      startDate: string;
      status: string;
    } | null;
    subjectAssignments: Array<{
      id: string;
      classId: string;
      className: string;
      sectionId: string;
      sectionName: string;
      subjectId: string;
      subjectName: string;
      subjectCode: string | null;
      periodsPerWeek: number | null;
      startDate: string;
      status: string;
    }>;
  };
  assignmentHistory: Array<{
    academicYear: {
      id: string;
      name: string;
    };
    classTeacherAssignments: Array<{
      id: string;
      className: string;
      sectionName: string;
      status: string;
      startDate: string;
      endDate: string | null;
    }>;
    subjectAssignments: Array<{
      id: string;
      className: string;
      sectionName: string;
      subjectName: string;
      status: string;
      startDate: string;
      endDate: string | null;
    }>;
  }>;
}

export interface UpdateTeacherProfileInput {
  name?: string;
  phone?: string | null;
  employeeId?: string | null;
  qualification?: string | null;
  specialization?: string | null;
  designation?: string | null;
  department?: string | null;
  joiningDate?: string | Date | null;
  status?: EmploymentStatus;
}

/**
 * Ensures that a User with role TEACHER has an associated TeacherProfile.
 * Lazily creates the profile if missing, ensuring backward compatibility.
 */
export async function ensureTeacherProfile(
  schoolId: string,
  userId: string,
  initialData?: Partial<UpdateTeacherProfileInput>
) {
  const user = await prisma.user.findFirst({
    where: { id: userId, schoolId, role: "TEACHER" },
    select: { id: true, schoolId: true },
  });

  if (!user) {
    throw new NotFoundError("Teacher user record not found in this school");
  }

  const existing = await prisma.teacherProfile.findUnique({
    where: { userId },
  });

  if (existing) {
    return existing;
  }

  return await prisma.teacherProfile.create({
    data: {
      schoolId,
      userId,
      employeeId: initialData?.employeeId?.trim() || null,
      qualification: initialData?.qualification?.trim() || null,
      specialization: initialData?.specialization?.trim() || null,
      designation: initialData?.designation?.trim() || "Instructor",
      department: initialData?.department?.trim() || "General Academics",
      joiningDate: initialData?.joiningDate ? new Date(initialData.joiningDate) : new Date(),
      status: initialData?.status || "ACTIVE",
    },
  });
}

/**
 * Retrieves the teacher directory with current academic year teaching assignments.
 */
export async function getTeacherDirectory(
  schoolId: string,
  academicYearId?: string
): Promise<TeacherListItem[]> {
  // Resolve target academic year
  let targetYearId = academicYearId;
  if (!targetYearId) {
    const currentYear = await prisma.academicYear.findFirst({
      where: { schoolId, isCurrent: true },
      select: { id: true },
    });
    targetYearId = currentYear?.id;
  }

  // Fetch all active teacher users
  const teacherUsers = await prisma.user.findMany({
    where: {
      schoolId,
      role: "TEACHER",
      deletedAt: null,
    },
    orderBy: { name: "asc" },
    include: {
      teacherProfile: {
        include: {
          classAssignments: {
            where: {
              status: "ACTIVE",
              ...(targetYearId ? { academicYearId: targetYearId } : {}),
            },
            include: { class: true, section: true },
          },
          subjectAssignments: {
            where: {
              status: "ACTIVE",
              ...(targetYearId ? { academicYearId: targetYearId } : {}),
            },
            include: { class: true, section: true, subject: true },
          },
        },
      },
    },
  });

  const list: TeacherListItem[] = [];

  for (const user of teacherUsers) {
    // If user lacks a profile, lazily ensure it
    let profile = user.teacherProfile;
    if (!profile) {
      profile = await prisma.teacherProfile.create({
        data: {
          schoolId,
          userId: user.id,
          designation: "Instructor",
          department: "General Academics",
          status: "ACTIVE",
        },
        include: {
          classAssignments: { include: { class: true, section: true } },
          subjectAssignments: { include: { class: true, section: true, subject: true } },
        },
      });
    }

    const classAssignment = profile.classAssignments?.[0] || null;
    const subjectAssignments = profile.subjectAssignments || [];

    // Distinct subjects and sections count
    const uniqueSubjects = new Set(subjectAssignments.map((a) => a.subjectId));
    const uniqueSections = new Set([
      ...(classAssignment ? [classAssignment.sectionId] : []),
      ...subjectAssignments.map((a) => a.sectionId),
    ]);

    const sectionsCount = uniqueSections.size;
    let workloadStatus: "LOW" | "NORMAL" | "HIGH" = "NORMAL";
    if (sectionsCount <= 2) {
      workloadStatus = "LOW";
    } else if (sectionsCount > 6) {
      workloadStatus = "HIGH";
    }

    list.push({
      id: profile.id,
      userId: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      employeeId: profile.employeeId,
      qualification: profile.qualification,
      specialization: profile.specialization,
      designation: profile.designation,
      department: profile.department,
      status: profile.status,
      isActive: user.isActive,
      joiningDate: profile.joiningDate ? profile.joiningDate.toISOString() : null,
      classTeacherFor: classAssignment
        ? {
            classId: classAssignment.classId,
            className: classAssignment.class.name,
            sectionId: classAssignment.sectionId,
            sectionName: classAssignment.section.name,
          }
        : null,
      subjectsCount: uniqueSubjects.size,
      sectionsCount,
      workloadStatus,
    });
  }

  return list;
}

/**
 * Retrieves full teacher profile details, current academic year assignments,
 * and comprehensive historical assignments from previous academic years.
 */
export async function getTeacherProfile(
  schoolId: string,
  teacherProfileIdOrUserId: string,
  academicYearId?: string
): Promise<TeacherDetail> {
  const profile = await prisma.teacherProfile.findFirst({
    where: {
      schoolId,
      OR: [{ id: teacherProfileIdOrUserId }, { userId: teacherProfileIdOrUserId }],
    },
    include: {
      user: true,
      classAssignments: {
        include: {
          academicYear: true,
          class: true,
          section: true,
        },
        orderBy: { startDate: "desc" },
      },
      subjectAssignments: {
        include: {
          academicYear: true,
          class: true,
          section: true,
          subject: true,
        },
        orderBy: { startDate: "desc" },
      },
    },
  });

  if (!profile) {
    // If teacher profile does not exist yet, check if User with role TEACHER exists
    const user = await prisma.user.findFirst({
      where: {
        id: teacherProfileIdOrUserId,
        schoolId,
        role: "TEACHER",
      },
    });

    if (user) {
      // Lazily create and re-fetch
      await ensureTeacherProfile(schoolId, user.id);
      return getTeacherProfile(schoolId, user.id, academicYearId);
    }

    throw new NotFoundError("Teacher profile not found");
  }

  // Resolve current active academic year
  let targetYear = null;
  if (academicYearId) {
    targetYear = await prisma.academicYear.findFirst({
      where: { id: academicYearId, schoolId },
    });
  }
  if (!targetYear) {
    targetYear = await prisma.academicYear.findFirst({
      where: { schoolId, isCurrent: true },
    });
  }

  const currentYearId = targetYear?.id;

  // Separate current active assignments from historical assignments
  const activeClassAssignment = currentYearId
    ? profile.classAssignments.find(
        (a) => a.academicYearId === currentYearId && a.status === "ACTIVE"
      ) || null
    : null;

  const activeSubjectAssignments = currentYearId
    ? profile.subjectAssignments.filter(
        (a) => a.academicYearId === currentYearId && a.status === "ACTIVE"
      )
    : [];

  // Group historical assignments by academic year (where not current active)
  const historyMap = new Map<
    string,
    {
      year: { id: string; name: string };
      classAssignments: Array<{
        id: string;
        className: string;
        sectionName: string;
        status: string;
        startDate: string;
        endDate: string | null;
      }>;
      subjectAssignments: Array<{
        id: string;
        className: string;
        sectionName: string;
        subjectName: string;
        status: string;
        startDate: string;
        endDate: string | null;
      }>;
    }
  >();

  for (const ca of profile.classAssignments) {
    // Only history if different year or not currently active
    if (ca.academicYearId !== currentYearId || ca.status !== "ACTIVE") {
      const yearId = ca.academicYearId;
      if (!historyMap.has(yearId)) {
        historyMap.set(yearId, {
          year: { id: ca.academicYear.id, name: ca.academicYear.name },
          classAssignments: [],
          subjectAssignments: [],
        });
      }
      historyMap.get(yearId)!.classAssignments.push({
        id: ca.id,
        className: ca.class.name,
        sectionName: ca.section.name,
        status: ca.status,
        startDate: ca.startDate.toISOString(),
        endDate: ca.endDate ? ca.endDate.toISOString() : null,
      });
    }
  }

  for (const sa of profile.subjectAssignments) {
    if (sa.academicYearId !== currentYearId || sa.status !== "ACTIVE") {
      const yearId = sa.academicYearId;
      if (!historyMap.has(yearId)) {
        historyMap.set(yearId, {
          year: { id: sa.academicYear.id, name: sa.academicYear.name },
          classAssignments: [],
          subjectAssignments: [],
        });
      }
      historyMap.get(yearId)!.subjectAssignments.push({
        id: sa.id,
        className: sa.class.name,
        sectionName: sa.section.name,
        subjectName: sa.subject.name,
        status: sa.status,
        startDate: sa.startDate.toISOString(),
        endDate: sa.endDate ? sa.endDate.toISOString() : null,
      });
    }
  }

  return {
    id: profile.id,
    userId: profile.userId,
    name: profile.user.name,
    email: profile.user.email,
    phone: profile.user.phone,
    employeeId: profile.employeeId,
    qualification: profile.qualification,
    specialization: profile.specialization,
    designation: profile.designation,
    department: profile.department,
    status: profile.status,
    isActive: profile.user.isActive,
    joiningDate: profile.joiningDate ? profile.joiningDate.toISOString() : null,
    currentAssignments: {
      academicYear: targetYear
        ? { id: targetYear.id, name: targetYear.name, isCurrent: targetYear.isCurrent }
        : null,
      classTeacherAssignment: activeClassAssignment
        ? {
            id: activeClassAssignment.id,
            classId: activeClassAssignment.classId,
            className: activeClassAssignment.class.name,
            sectionId: activeClassAssignment.sectionId,
            sectionName: activeClassAssignment.section.name,
            startDate: activeClassAssignment.startDate.toISOString(),
            status: activeClassAssignment.status,
          }
        : null,
      subjectAssignments: activeSubjectAssignments.map((sa) => ({
        id: sa.id,
        classId: sa.classId,
        className: sa.class.name,
        sectionId: sa.sectionId,
        sectionName: sa.section.name,
        subjectId: sa.subjectId,
        subjectName: sa.subject.name,
        subjectCode: sa.subject.code,
        periodsPerWeek: sa.periodsPerWeek,
        startDate: sa.startDate.toISOString(),
        status: sa.status,
      })),
    },
    assignmentHistory: Array.from(historyMap.values()).map((h) => ({
      academicYear: h.year,
      classTeacherAssignments: h.classAssignments,
      subjectAssignments: h.subjectAssignments,
    })),
  };
}

/**
 * Updates a teacher's permanent employment and professional profile details.
 */
export async function updateTeacherProfile(
  schoolId: string,
  teacherProfileIdOrUserId: string,
  data: UpdateTeacherProfileInput,
  actorUserId?: string,
  actorRole?: string
) {
  const profile = await prisma.teacherProfile.findFirst({
    where: {
      schoolId,
      OR: [{ id: teacherProfileIdOrUserId }, { userId: teacherProfileIdOrUserId }],
    },
    include: { user: true },
  });

  if (!profile) {
    throw new NotFoundError("Teacher profile not found in this school");
  }

  // Phase 3 D: Teachers may update only explicitly permitted personal fields (phone).
  // They must not edit employee identifiers, employment status, qualifications, designations, etc.
  if (actorRole === "TEACHER") {
    if (
      data.employeeId !== undefined ||
      data.status !== undefined ||
      data.qualification !== undefined ||
      data.specialization !== undefined ||
      data.designation !== undefined ||
      data.department !== undefined ||
      data.joiningDate !== undefined
    ) {
      throw new ForbiddenError(
        "Teachers are not authorized to modify employment status, employee identifiers, qualifications, or designations"
      );
    }
  }

  // Validate employeeId uniqueness if changed
  if (data.employeeId && data.employeeId.trim() !== "") {
    const cleanEmpId = data.employeeId.trim();
    const duplicate = await prisma.teacherProfile.findFirst({
      where: {
        schoolId,
        employeeId: cleanEmpId,
        id: { not: profile.id },
      },
    });

    if (duplicate) {
      throw new ConflictError(`Employee ID '${cleanEmpId}' is already assigned to another teacher`);
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    // Update User name/phone if provided
    if (data.name !== undefined || data.phone !== undefined) {
      await tx.user.update({
        where: { id: profile.userId },
        data: {
          ...(data.name !== undefined ? { name: data.name.trim() } : {}),
          ...(data.phone !== undefined ? { phone: data.phone?.trim() || null } : {}),
        },
      });
    }

    return await tx.teacherProfile.update({
      where: { id: profile.id },
      data: {
        ...(data.employeeId !== undefined ? { employeeId: data.employeeId?.trim() || null } : {}),
        ...(data.qualification !== undefined
          ? { qualification: data.qualification?.trim() || null }
          : {}),
        ...(data.specialization !== undefined
          ? { specialization: data.specialization?.trim() || null }
          : {}),
        ...(data.designation !== undefined
          ? { designation: data.designation?.trim() || null }
          : {}),
        ...(data.department !== undefined ? { department: data.department?.trim() || null } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.joiningDate !== undefined
          ? { joiningDate: data.joiningDate ? new Date(data.joiningDate) : null }
          : {}),
      },
      include: { user: true },
    });
  });

  await logAuditEvent({
    action: "TEACHER_PROFILE_UPDATED",
    entityType: "TeacherProfile",
    entityId: updated.id,
    schoolId,
    userId: actorUserId,
    details: {
      teacherName: updated.user.name,
      employeeId: updated.employeeId,
      designation: updated.designation,
      status: updated.status,
    },
  });

  return updated;
}
