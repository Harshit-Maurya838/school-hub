import { prisma } from "@/lib/prisma";
import { Role, EmploymentStatus } from "@/generated/prisma/enums";
import { ConflictError, BadRequestError } from "@/lib/errors";
import { logAuditEvent } from "@/lib/audit";
import { issueInvitation } from "@/modules/onboarding/services/invitations";

export interface CreateStaffInput {
  name: string;
  email: string;
  phone?: string | null;
  role?: Role;
  employeeId?: string | null;
  qualification?: string | null;
  specialization?: string | null;
  designation?: string | null;
  department?: string | null;
  joiningDate?: string | Date | null;
  employmentStatus?: EmploymentStatus;
}

export interface CreateStaffMemberParams extends CreateStaffInput {
  schoolId: string;
  actorUserId?: string;
  sendInvite?: boolean;
  ipAddress?: string;
  userAgent?: string;
}

export interface BulkCreateStaffParams {
  schoolId: string;
  actorUserId?: string;
  members: CreateStaffInput[];
  sendInvitesImmediately?: boolean;
  ipAddress?: string;
  userAgent?: string;
}

export interface StaffDirectoryItem {
  id: string; // User ID
  name: string;
  email: string | null;
  phone: string | null;
  role: Role;
  isActive: boolean;
  createdAt: string;
  hasActiveAccount: boolean;
  invitationStatus: "ACTIVE" | "PENDING" | "EXPIRED" | "REVOKED" | "NOT_INVITED";
  latestInvitation: {
    id: string;
    status: string;
    expiresAt: string;
    createdAt: string;
  } | null;
  teacherProfile?: {
    id: string;
    employeeId: string | null;
    designation: string | null;
    department: string | null;
    qualification: string | null;
    specialization: string | null;
    joiningDate: string | null;
    status: EmploymentStatus;
    classTeacherFor: {
      classId: string;
      className: string;
      sectionId: string;
      sectionName: string;
    } | null;
    subjectsCount: number;
    sectionsCount: number;
    workloadStatus: "LOW" | "NORMAL" | "HIGH";
  } | null;
}

/**
 * Creates a single staff or teacher profile record.
 * Supports optional immediate invitation issuance, or leaving in a pre-created state
 * awaiting an administrator's manual invite trigger.
 */
export async function createStaffMember(params: CreateStaffMemberParams) {
  const normalizedEmail = params.email.toLowerCase().trim();
  const normalizedName = params.name.trim();

  if (!normalizedName) {
    throw new BadRequestError("Staff member full name is required");
  }

  if (!normalizedEmail) {
    throw new BadRequestError("Staff member email address is required");
  }

  const role = params.role || "TEACHER";
  if (!["TEACHER", "ACCOUNTANT", "SCHOOL_ADMIN"].includes(role)) {
    throw new BadRequestError("Staff role must be TEACHER, ACCOUNTANT, or SCHOOL_ADMIN");
  }

  // Check if an account already exists with this email
  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true, schoolId: true, passwordHash: true, isActive: true, deletedAt: true },
  });

  if (existingUser && existingUser.isActive && existingUser.deletedAt === null) {
    if (existingUser.passwordHash !== null) {
      throw new ConflictError("A user account with this email address already exists");
    }
    if (existingUser.schoolId !== params.schoolId) {
      throw new ConflictError("An account with this email exists in another school");
    }
    throw new ConflictError(
      "A staff profile with this email already exists in this school. You can issue or resend an invitation directly."
    );
  }

  // Check employee ID uniqueness if provided for teachers
  const cleanEmpId = params.employeeId?.trim() || null;
  if (role === "TEACHER" && cleanEmpId) {
    const existingEmp = await prisma.teacherProfile.findFirst({
      where: { schoolId: params.schoolId, employeeId: cleanEmpId },
      select: { id: true },
    });
    if (existingEmp) {
      throw new ConflictError(`Employee ID '${cleanEmpId}' is already assigned in this school`);
    }
  }

  // Atomically create User and (if Teacher) TeacherProfile
  const { user, teacherProfile } = await prisma.$transaction(async (tx) => {
    const createdUser = await tx.user.create({
      data: {
        schoolId: params.schoolId,
        name: normalizedName,
        email: normalizedEmail,
        phone: params.phone?.trim() || null,
        role,
        isActive: true,
        passwordHash: null, // Pre-created profile, password set upon accepting invitation
      },
    });

    let profile = null;
    if (role === "TEACHER") {
      profile = await tx.teacherProfile.create({
        data: {
          schoolId: params.schoolId,
          userId: createdUser.id,
          employeeId: cleanEmpId,
          qualification: params.qualification?.trim() || null,
          specialization: params.specialization?.trim() || null,
          designation: params.designation?.trim() || "Instructor",
          department: params.department?.trim() || "General Academics",
          joiningDate: params.joiningDate ? new Date(params.joiningDate) : new Date(),
          status: params.employmentStatus || "ACTIVE",
        },
      });
    }

    return { user: createdUser, teacherProfile: profile };
  });

  await logAuditEvent({
    action: "STAFF_MEMBER_CREATED",
    entityType: "User",
    entityId: user.id,
    schoolId: params.schoolId,
    userId: params.actorUserId,
    details: {
      name: user.name,
      email: user.email,
      role: user.role,
      employeeId: cleanEmpId,
      invitedImmediately: Boolean(params.sendInvite),
    },
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
  });

  let invitationResult: {
    invitation: { id: string; email: string; role: Role; status: string; expiresAt: Date };
    actionUrl: string;
    rawToken: string;
  } | null = null;

  if (params.sendInvite) {
    invitationResult = await issueInvitation({
      schoolId: params.schoolId,
      email: normalizedEmail,
      role,
      invitedById: params.actorUserId,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });
  }

  return {
    user,
    teacherProfile,
    invitation: invitationResult?.invitation || null,
    actionUrl: invitationResult?.actionUrl || null,
  };
}

/**
 * Bulk creates multiple staff members with validation, duplicate detection,
 * and optional immediate invitation dispatches.
 */
export async function createStaffBulk(params: BulkCreateStaffParams) {
  if (!params.members || !Array.isArray(params.members) || params.members.length === 0) {
    throw new BadRequestError("At least one staff member must be provided for bulk import");
  }

  if (params.members.length > 200) {
    throw new BadRequestError("Bulk creation is limited to 200 staff members per batch");
  }

  const created: Array<{
    user: { id: string; name: string; email: string | null; role: Role };
    teacherProfileId?: string | null;
    actionUrl?: string | null;
  }> = [];

  const errors: Array<{
    index: number;
    email: string;
    error: string;
  }> = [];

  // Track emails and employeeIds within this batch to prevent internal duplicates
  const seenEmails = new Set<string>();
  const seenEmpIds = new Set<string>();

  // Fetch all existing emails in this school
  const allSubmittedEmails = params.members
    .map((m) => m.email?.toLowerCase().trim())
    .filter(Boolean);

  const existingUsers = await prisma.user.findMany({
    where: {
      email: { in: allSubmittedEmails },
      deletedAt: null,
    },
    select: { email: true, schoolId: true, passwordHash: true },
  });
  const existingEmailMap = new Map(existingUsers.map((u) => [u.email?.toLowerCase(), u]));

  // Fetch all existing employee IDs in this school
  const allSubmittedEmpIds = params.members
    .map((m) => m.employeeId?.trim())
    .filter((id): id is string => Boolean(id));

  const existingProfiles = await prisma.teacherProfile.findMany({
    where: {
      schoolId: params.schoolId,
      employeeId: { in: allSubmittedEmpIds },
    },
    select: { employeeId: true },
  });
  const existingEmpIdSet = new Set(existingProfiles.map((p) => p.employeeId));

  // Process rows
  for (let i = 0; i < params.members.length; i++) {
    const row = params.members[i];
    const email = row.email?.toLowerCase().trim();
    const name = row.name?.trim();
    const role = row.role || "TEACHER";
    const employeeId = row.employeeId?.trim() || null;

    if (!name) {
      errors.push({ index: i, email: email || `Row ${i + 1}`, error: "Full name is required" });
      continue;
    }

    if (!email || !email.includes("@")) {
      errors.push({ index: i, email: email || `Row ${i + 1}`, error: "Valid email is required" });
      continue;
    }

    if (seenEmails.has(email)) {
      errors.push({ index: i, email, error: "Duplicate email within this bulk batch" });
      continue;
    }
    seenEmails.add(email);

    if (existingEmailMap.has(email)) {
      errors.push({
        index: i,
        email,
        error: "A user account with this email already exists in the system",
      });
      continue;
    }

    if (role === "TEACHER" && employeeId) {
      if (seenEmpIds.has(employeeId)) {
        errors.push({
          index: i,
          email,
          error: `Duplicate employee ID '${employeeId}' within this bulk batch`,
        });
        continue;
      }
      if (existingEmpIdSet.has(employeeId)) {
        errors.push({
          index: i,
          email,
          error: `Employee ID '${employeeId}' is already in use by an existing teacher`,
        });
        continue;
      }
      seenEmpIds.add(employeeId);
    }

    try {
      const result = await createStaffMember({
        schoolId: params.schoolId,
        actorUserId: params.actorUserId,
        name,
        email,
        phone: row.phone,
        role,
        employeeId,
        qualification: row.qualification,
        specialization: row.specialization,
        designation: row.designation,
        department: row.department,
        joiningDate: row.joiningDate,
        employmentStatus: row.employmentStatus,
        sendInvite: params.sendInvitesImmediately,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      });

      created.push({
        user: {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
          role: result.user.role,
        },
        teacherProfileId: result.teacherProfile?.id || null,
        actionUrl: result.actionUrl,
      });
    } catch (err: unknown) {
      errors.push({
        index: i,
        email,
        error: err instanceof Error ? err.message : "Failed to create staff record",
      });
    }
  }

  await logAuditEvent({
    action: "STAFF_BULK_CREATED",
    entityType: "User",
    schoolId: params.schoolId,
    userId: params.actorUserId,
    details: {
      totalSubmitted: params.members.length,
      totalCreated: created.length,
      totalFailed: errors.length,
      sentInvitesImmediately: Boolean(params.sendInvitesImmediately),
    },
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
  });

  return {
    totalSubmitted: params.members.length,
    totalCreated: created.length,
    created,
    errors,
  };
}

/**
 * Retrieves the comprehensive staff directory with real-time invitation and account status.
 */
export async function getStaffDirectoryWithInviteStatus(
  schoolId: string,
  academicYearId?: string
): Promise<StaffDirectoryItem[]> {
  const currentYear = academicYearId
    ? await prisma.academicYear.findFirst({ where: { id: academicYearId, schoolId } })
    : await prisma.academicYear.findFirst({ where: { schoolId, isCurrent: true } });

  const targetYearId = currentYear?.id;

  // Fetch staff users and their latest invitations
  const [users, invitations] = await Promise.all([
    prisma.user.findMany({
      where: {
        schoolId,
        role: { in: ["SCHOOL_ADMIN", "TEACHER", "ACCOUNTANT"] },
        deletedAt: null,
      },
      orderBy: { createdAt: "desc" },
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
    }),
    prisma.invitation.findMany({
      where: {
        schoolId,
        role: { in: ["SCHOOL_ADMIN", "TEACHER", "ACCOUNTANT"] },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        status: true,
        expiresAt: true,
        createdAt: true,
      },
    }),
  ]);

  // Index invitations by normalized email (most recent first)
  const latestInviteMap = new Map<
    string,
    { id: string; status: string; expiresAt: Date; createdAt: Date }
  >();
  for (const inv of invitations) {
    const key = inv.email.toLowerCase();
    if (!latestInviteMap.has(key)) {
      latestInviteMap.set(key, inv);
    }
  }

  const now = new Date();

  return users.map((user) => {
    const hasActiveAccount = user.passwordHash !== null;
    const emailKey = user.email ? user.email.toLowerCase() : "";
    const latestInvite = emailKey ? latestInviteMap.get(emailKey) : null;

    let computedStatus: "ACTIVE" | "PENDING" | "EXPIRED" | "REVOKED" | "NOT_INVITED" =
      "NOT_INVITED";

    if (hasActiveAccount) {
      computedStatus = "ACTIVE";
    } else if (latestInvite) {
      if (latestInvite.status === "ACCEPTED") {
        computedStatus = "ACTIVE";
      } else if (latestInvite.status === "REVOKED") {
        computedStatus = "REVOKED";
      } else if (latestInvite.status === "EXPIRED" || latestInvite.expiresAt < now) {
        computedStatus = "EXPIRED";
      } else if (latestInvite.status === "PENDING") {
        computedStatus = "PENDING";
      }
    }

    let teacherDetails: StaffDirectoryItem["teacherProfile"] = null;
    if (user.role === "TEACHER" && user.teacherProfile) {
      const profile = user.teacherProfile;
      const classAssignment = profile.classAssignments?.[0] || null;
      const subjectAssignments = profile.subjectAssignments || [];

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

      teacherDetails = {
        id: profile.id,
        employeeId: profile.employeeId,
        designation: profile.designation,
        department: profile.department,
        qualification: profile.qualification,
        specialization: profile.specialization,
        joiningDate: profile.joiningDate ? profile.joiningDate.toISOString() : null,
        status: profile.status,
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
      };
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt.toISOString(),
      hasActiveAccount,
      invitationStatus: computedStatus,
      latestInvitation: latestInvite
        ? {
            id: latestInvite.id,
            status: latestInvite.status,
            expiresAt: latestInvite.expiresAt.toISOString(),
            createdAt: latestInvite.createdAt.toISOString(),
          }
        : null,
      teacherProfile: teacherDetails,
    };
  });
}
