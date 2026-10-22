// Role Based Access Control & Assignment-Scoped Authorization Engine
import { Role } from "@/generated/prisma/enums";
import { AuthenticatedUser, getAuthenticatedUser } from "./auth";
import { ForbiddenError, UnauthorizedError } from "./errors";
import { prisma } from "./prisma";
import { NextRequest } from "next/server";

export type Permission =
  // Legacy Platform permissions
  | "platform:manage"
  | "platform:view"
  | "school:create"
  | "registration:manage"
  | "registration:view"
  // Legacy School administration permissions
  | "school:manage"
  | "school:view"
  | "staff:manage"
  | "staff:view"
  | "invitation:create"
  | "invitation:view"
  | "invitation:revoke"
  // Legacy Student & Guardian permissions
  | "student:create"
  | "student:update"
  | "student:delete"
  | "student:view:all"
  | "student:view:own"
  | "guardian:manage"
  | "guardian:view"
  // Legacy Academic permissions
  | "academic:manage"
  | "academic:view"
  | "attendance:manage"
  | "attendance:view"
  | "grades:manage"
  | "grades:view"
  // Legacy Financial permissions
  | "fees:manage"
  | "fees:view"
  // Legacy Audit logs
  | "audit:view"
  // Modern Explicit Permissions (Phase 2 Canonical Vocabulary)
  | "school.profile.read"
  | "school.profile.update"
  | "students.read"
  | "students.admit"
  | "students.update"
  | "students.archive"
  | "academics.read"
  | "academics.configure"
  | "teachers.read"
  | "teachers.manage"
  | "teaching_assignments.manage"
  | "attendance.read"
  | "attendance.mark"
  | "attendance.correct"
  | "attendance.approve"
  | "exams.read"
  | "marks.enter"
  | "marks.review"
  | "results.publish"
  | "fees.read"
  | "fees.collect"
  | "fees.configure"
  | "reports.read"
  | "audit.read";

/**
 * Explicit mapping of roles to permitted actions.
 * Access is denied by default unless explicitly granted here.
 * Backward compatible with existing tests while incorporating the Phase 2 canonical vocabulary.
 */
export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  SUPER_ADMIN: [
    "platform:manage",
    "platform:view",
    "school:create",
    "school:manage",
    "school:view",
    "audit:view",
    "registration:manage",
    "registration:view",
    "school.profile.read",
    "audit.read",
    "reports.read",
  ],
  SCHOOL_ADMIN: [
    "school:manage",
    "school:view",
    "staff:manage",
    "staff:view",
    "invitation:create",
    "invitation:view",
    "invitation:revoke",
    "student:create",
    "student:update",
    "student:delete",
    "student:view:all",
    "guardian:manage",
    "guardian:view",
    "academic:manage",
    "academic:view",
    "attendance:manage",
    "attendance:view",
    "grades:manage",
    "grades:view",
    "fees:manage",
    "fees:view",
    "audit:view",
    // Canonical Phase 2 permissions
    "school.profile.read",
    "school.profile.update",
    "students.read",
    "students.admit",
    "students.update",
    "students.archive",
    "academics.read",
    "academics.configure",
    "teachers.read",
    "teachers.manage",
    "teaching_assignments.manage",
    "attendance.read",
    "attendance.mark",
    "attendance.correct",
    "attendance.approve",
    "exams.read",
    "marks.enter",
    "marks.review",
    "results.publish",
    "fees.read",
    "fees.collect",
    "fees.configure",
    "reports.read",
    "audit.read",
  ],
  ACCOUNTANT: [
    "fees:manage",
    "fees:view",
    "student:view:all",
    "school:view",
    // Canonical Phase 2 permissions
    "school.profile.read",
    "fees.read",
    "fees.collect",
    "fees.configure",
    "students.read",
    "reports.read",
  ],
  TEACHER: [
    "academic:view",
    "attendance:manage",
    "attendance:view",
    "grades:manage",
    "grades:view",
    "student:view:all",
    "school:view",
    // Canonical Phase 2 permissions
    "school.profile.read",
    "academics.read",
    "teachers.read",
    "attendance.read",
    "attendance.mark",
    "attendance.correct",
    "exams.read",
    "marks.enter",
    "students.read",
  ],
  PARENT: [
    "student:view:own",
    "attendance:view",
    "grades:view",
    "fees:view",
    // Canonical Phase 2 permissions
    "students.read",
    "attendance.read",
    "fees.read",
  ],
  STUDENT: [
    "student:view:own",
    "academic:view",
    "attendance:view",
    "grades:view",
    // Canonical Phase 2 permissions
    "students.read",
    "academics.read",
    "attendance.read",
  ],
};

/**
 * Checks whether a given role has a specific permission.
 */
export function hasPermission(role: Role, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  if (!permissions) return false;
  return permissions.includes(permission);
}

/**
 * Enforces that the incoming request is authenticated with an active account.
 * Throws UnauthorizedError (401) if missing, inactive, or soft-deleted.
 */
export async function requireAuth(req?: NextRequest | Request): Promise<AuthenticatedUser> {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    throw new UnauthorizedError("Authentication required or session expired");
  }
  return user;
}

/**
 * Enforces that the user has one of the allowed roles.
 * Throws ForbiddenError (403) if the user's role is not in the allowed list.
 */
export function requireRole(user: AuthenticatedUser, allowedRoles: Role[]): void {
  if (!allowedRoles.includes(user.role)) {
    throw new ForbiddenError(
      `Access denied: role '${user.role}' is not authorized for this operation`
    );
  }
}

/**
 * Enforces that the user's role has the required permission.
 * Throws ForbiddenError (403) if denied.
 */
export function requirePermission(user: AuthenticatedUser, permission: Permission): void {
  if (!hasPermission(user.role, permission)) {
    throw new ForbiddenError(`Access denied: missing permission '${permission}'`);
  }
}

/**
 * Resource-level tenant check:
 * Verifies that the authenticated user belongs to the requested school.
 * SUPER_ADMIN is permitted to access any school context for platform maintenance.
 */
export function assertSchoolAccess(user: AuthenticatedUser, targetSchoolId: string): void {
  if (user.role === "SUPER_ADMIN") {
    return;
  }

  if (!user.schoolId || user.schoolId !== targetSchoolId) {
    throw new ForbiddenError("Cross-tenant access forbidden");
  }
}

/**
 * Helper to check whether user can access a school without throwing.
 */
export function canAccessSchool(user: AuthenticatedUser, targetSchoolId: string): boolean {
  if (user.role === "SUPER_ADMIN") return true;
  return Boolean(user.schoolId && user.schoolId === targetSchoolId);
}

/**
 * Resource-level check for Parents:
 * Verifies that the parent user is an authorized guardian of the target student.
 */
export async function assertParentStudentAccess(
  user: AuthenticatedUser,
  studentId: string
): Promise<void> {
  if (user.role === "SUPER_ADMIN" || user.role === "SCHOOL_ADMIN") {
    return;
  }

  if (user.role !== "PARENT") {
    throw new ForbiddenError("Only linked parents or school administrators can access this record");
  }

  const guardian = await prisma.guardian.findFirst({
    where: {
      userId: user.id,
      schoolId: user.schoolId ?? undefined,
    },
    select: { id: true },
  });

  if (!guardian) {
    throw new ForbiddenError("Guardian profile not found for authenticated user");
  }

  const link = await prisma.studentGuardian.findUnique({
    where: {
      studentId_guardianId: {
        studentId,
        guardianId: guardian.id,
      },
    },
  });

  if (!link) {
    throw new ForbiddenError("Access denied: guardian is not linked to this student");
  }
}

/**
 * Resource-level check for Students:
 * Verifies that the student user is accessing their own student record.
 */
export async function assertStudentOwnAccess(
  user: AuthenticatedUser,
  studentId: string
): Promise<void> {
  if (user.role === "SUPER_ADMIN" || user.role === "SCHOOL_ADMIN") {
    return;
  }

  if (user.role !== "STUDENT") {
    throw new ForbiddenError("Only the student or school administrators can access this record");
  }

  const student = await prisma.student.findFirst({
    where: {
      id: studentId,
      userId: user.id,
      schoolId: user.schoolId ?? undefined,
    },
    select: { id: true },
  });

  if (!student) {
    throw new ForbiddenError("Access denied: student can only access their own record");
  }
}

/**
 * Resource-level check for Teachers:
 * School Administrators & Super Admins can access any teacher in the school.
 * Teachers can only access their own profile and assignments.
 */
export async function assertTeacherAccess(
  user: AuthenticatedUser,
  teacherProfileIdOrUserId: string
): Promise<void> {
  if (user.role === "SUPER_ADMIN" || user.role === "SCHOOL_ADMIN") {
    return;
  }

  if (user.role !== "TEACHER") {
    throw new ForbiddenError("Only the teacher or school administrators can access this record");
  }

  const profile = await prisma.teacherProfile.findFirst({
    where: {
      schoolId: user.schoolId ?? undefined,
      OR: [{ id: teacherProfileIdOrUserId }, { userId: teacherProfileIdOrUserId }],
    },
    select: { userId: true },
  });

  if (!profile || profile.userId !== user.id) {
    if (teacherProfileIdOrUserId !== user.id) {
      throw new ForbiddenError("Access denied: teacher can only access their own profile");
    }
  }
}

// ============================================================================
// Phase 4: Assignment-Scoped Authorization Services & Centralized Checks
// ============================================================================

export interface TeacherAssignmentContext {
  teacherProfileId: string;
  isActive: boolean;
  employmentStatus: string;
  academicYearId: string;
  academicYearName: string;
  isClassTeacher: boolean;
  classTeacherSectionIds: string[];
  classTeacherSections: Array<{
    classId: string;
    className: string;
    sectionId: string;
    sectionName: string;
  }>;
  isSubjectTeacher: boolean;
  subjectSectionIds: string[];
  subjectAssignments: Array<{
    classId: string;
    className: string;
    sectionId: string;
    sectionName: string;
    subjectId: string;
    subjectName: string;
  }>;
  /** Union of class teacher section IDs and subject section IDs */
  allPermittedSectionIds: string[];
}

/**
 * Resolves a teacher's active assignments in the current or specified academic year.
 * Strict rules:
 * - Teacher must be active in User and active in TeacherProfile (status === 'ACTIVE').
 * - Only ACTIVE assignments for the applicable academic year are included.
 * - REPLACED, COMPLETED, or CANCELLED assignments are strictly excluded.
 */
export async function getTeacherActiveAssignments(
  schoolId: string,
  userId: string,
  academicYearId?: string
): Promise<TeacherAssignmentContext | null> {
  const profile = await prisma.teacherProfile.findFirst({
    where: { schoolId, userId },
    include: { user: true },
  });

  if (!profile || !profile.user.isActive || profile.user.deletedAt !== null) {
    return null;
  }

  // Teacher must be in ACTIVE employment status (not TERMINATED, RESIGNED, ON_LEAVE)
  if (profile.status !== "ACTIVE") {
    return null;
  }

  // Resolve target academic year
  let targetYear: { id: string; name: string } | null = null;
  if (academicYearId) {
    targetYear = await prisma.academicYear.findFirst({
      where: { id: academicYearId, schoolId },
      select: { id: true, name: true },
    });
  }
  if (!targetYear) {
    targetYear = await prisma.academicYear.findFirst({
      where: { schoolId, isCurrent: true },
      select: { id: true, name: true },
    });
  }

  if (!targetYear) {
    return null;
  }

  const [classAssignments, subjectAssignments] = await Promise.all([
    prisma.classTeacherAssignment.findMany({
      where: {
        schoolId,
        teacherProfileId: profile.id,
        academicYearId: targetYear.id,
        status: "ACTIVE",
      },
      include: { class: true, section: true },
    }),
    prisma.subjectTeacherAssignment.findMany({
      where: {
        schoolId,
        teacherProfileId: profile.id,
        academicYearId: targetYear.id,
        status: "ACTIVE",
      },
      include: { class: true, section: true, subject: true },
    }),
  ]);

  const classTeacherSectionIds = classAssignments.map((ca) => ca.sectionId);
  const subjectSectionIds = subjectAssignments.map((sa) => sa.sectionId);
  const allPermittedSectionIds = Array.from(
    new Set([...classTeacherSectionIds, ...subjectSectionIds])
  );

  return {
    teacherProfileId: profile.id,
    isActive: profile.user.isActive && profile.status === "ACTIVE",
    employmentStatus: profile.status,
    academicYearId: targetYear.id,
    academicYearName: targetYear.name,
    isClassTeacher: classAssignments.length > 0,
    classTeacherSectionIds,
    classTeacherSections: classAssignments.map((ca) => ({
      classId: ca.classId,
      className: ca.class.name,
      sectionId: ca.sectionId,
      sectionName: ca.section.name,
    })),
    isSubjectTeacher: subjectAssignments.length > 0,
    subjectSectionIds,
    subjectAssignments: subjectAssignments.map((sa) => ({
      classId: sa.classId,
      className: sa.class.name,
      sectionId: sa.sectionId,
      sectionName: sa.section.name,
      subjectId: sa.subjectId,
      subjectName: sa.subject.name,
    })),
    allPermittedSectionIds,
  };
}

/**
 * Checks whether the user can access a specific section.
 * - SCHOOL_ADMIN / SUPER_ADMIN: can access any section in the school.
 * - TEACHER: can only access sections where they have an active assignment (class or subject).
 */
export async function canAccessSection(
  user: AuthenticatedUser,
  sectionId: string,
  academicYearId?: string
): Promise<boolean> {
  if (user.role === "SUPER_ADMIN") return true;

  if (user.role === "SCHOOL_ADMIN") {
    const section = await prisma.section.findFirst({
      where: { id: sectionId, schoolId: user.schoolId ?? undefined },
      select: { id: true },
    });
    return section !== null;
  }

  if (user.role === "TEACHER" && user.schoolId) {
    const assignments = await getTeacherActiveAssignments(user.schoolId, user.id, academicYearId);
    if (!assignments) return false;
    return assignments.allPermittedSectionIds.includes(sectionId);
  }

  return false;
}

/**
 * Phase 5 Attendance Policy:
 * 1. The class teacher marks daily attendance for their assigned section.
 * 2. Subject teachers do not automatically receive daily attendance edit permissions.
 * 3. School Admin retains oversight.
 */
export async function canMarkAttendance(
  user: AuthenticatedUser,
  sectionId: string,
  academicYearId?: string
): Promise<boolean> {
  if (user.role === "SUPER_ADMIN") return true;

  if (user.role === "SCHOOL_ADMIN") {
    const section = await prisma.section.findFirst({
      where: { id: sectionId, schoolId: user.schoolId ?? undefined },
      select: { id: true },
    });
    return section !== null;
  }

  if (user.role === "TEACHER" && user.schoolId) {
    const assignments = await getTeacherActiveAssignments(user.schoolId, user.id, academicYearId);
    if (!assignments) return false;
    // Strict Policy: Only the actively assigned Class Teacher can mark daily attendance!
    return assignments.classTeacherSectionIds.includes(sectionId);
  }

  return false;
}

/**
 * Attendance corrections follow the same rule: only active Class Teacher or School Admin.
 */
export async function canCorrectAttendance(
  user: AuthenticatedUser,
  sectionId: string,
  academicYearId?: string
): Promise<boolean> {
  return canMarkAttendance(user, sectionId, academicYearId);
}

/**
 * Checks whether the user can access a specific subject in a section.
 * Subject teachers are scoped strictly to their assigned subject-section combinations.
 */
export async function canAccessSubject(
  user: AuthenticatedUser,
  subjectId: string,
  sectionId: string,
  academicYearId?: string
): Promise<boolean> {
  if (user.role === "SUPER_ADMIN") return true;

  if (user.role === "SCHOOL_ADMIN") {
    const subject = await prisma.subject.findFirst({
      where: { id: subjectId, schoolId: user.schoolId ?? undefined },
      select: { id: true },
    });
    return subject !== null;
  }

  if (user.role === "TEACHER" && user.schoolId) {
    const assignments = await getTeacherActiveAssignments(user.schoolId, user.id, academicYearId);
    if (!assignments) return false;
    return assignments.subjectAssignments.some(
      (sa) => sa.subjectId === subjectId && sa.sectionId === sectionId
    );
  }

  return false;
}

/**
 * Checks whether the user can enter or modify marks for a subject in a section.
 */
export async function canEnterMarks(
  user: AuthenticatedUser,
  subjectId: string,
  sectionId: string,
  academicYearId?: string
): Promise<boolean> {
  return canAccessSubject(user, subjectId, sectionId, academicYearId);
}

/**
 * Checks whether the user can manage teaching assignments for a school.
 * Only SCHOOL_ADMIN of that school (or SUPER_ADMIN) is permitted.
 */
export function canManageTeachingAssignments(user: AuthenticatedUser, schoolId: string): boolean {
  if (user.role === "SUPER_ADMIN") return true;
  return user.role === "SCHOOL_ADMIN" && user.schoolId === schoolId;
}

/**
 * Checks whether the user can access a student's records:
 * - SCHOOL_ADMIN / ACCOUNTANT: permitted for all students within their school.
 * - TEACHER: permitted ONLY if student is actively enrolled in one of the teacher's actively assigned sections.
 * - PARENT: permitted if linked guardian.
 * - STUDENT: permitted if own record.
 */
export async function canAccessStudent(
  user: AuthenticatedUser,
  studentId: string,
  academicYearId?: string
): Promise<boolean> {
  if (user.role === "SUPER_ADMIN") return true;

  if (user.role === "SCHOOL_ADMIN" || user.role === "ACCOUNTANT") {
    const student = await prisma.student.findFirst({
      where: { id: studentId, schoolId: user.schoolId ?? undefined },
      select: { id: true },
    });
    return student !== null;
  }

  if (user.role === "TEACHER" && user.schoolId) {
    const assignments = await getTeacherActiveAssignments(user.schoolId, user.id, academicYearId);
    if (!assignments || assignments.allPermittedSectionIds.length === 0) {
      return false;
    }

    const enrollment = await prisma.enrollment.findFirst({
      where: {
        studentId,
        schoolId: user.schoolId,
        academicYearId: assignments.academicYearId,
        status: "ACTIVE",
        sectionId: { in: assignments.allPermittedSectionIds },
      },
      select: { id: true },
    });
    return enrollment !== null;
  }

  if (user.role === "PARENT") {
    try {
      await assertParentStudentAccess(user, studentId);
      return true;
    } catch {
      return false;
    }
  }

  if (user.role === "STUDENT") {
    try {
      await assertStudentOwnAccess(user, studentId);
      return true;
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * Helper to check module access with tenant verification.
 */
export function canAccessSchoolModule(
  user: AuthenticatedUser,
  permission: Permission,
  targetSchoolId?: string
): boolean {
  if (targetSchoolId && user.role !== "SUPER_ADMIN" && user.schoolId !== targetSchoolId) {
    return false;
  }
  return hasPermission(user.role, permission);
}

/**
 * Redacts sensitive fields from student objects for non-administrative roles such as ACCOUNTANT.
 * Strips apaarId and non-essential personal identifiers.
 */
export function sanitizeStudentForAccountant<T extends object>(student: T): T {
  const sanitized = { ...student };
  if ("apaarId" in sanitized) {
    delete (sanitized as { apaarId?: unknown }).apaarId;
  }
  return sanitized;
}

// ============================================================================
// Assertion Wrappers (throwing 403 Forbidden on failure)
// ============================================================================

export async function assertSectionAccess(
  user: AuthenticatedUser,
  sectionId: string,
  academicYearId?: string
): Promise<void> {
  const allowed = await canAccessSection(user, sectionId, academicYearId);
  if (!allowed) {
    throw new ForbiddenError(
      `Access denied: You are not authorized to access section '${sectionId}'`
    );
  }
}

export async function assertAttendanceMarkingAccess(
  user: AuthenticatedUser,
  sectionId: string,
  academicYearId?: string
): Promise<void> {
  const allowed = await canMarkAttendance(user, sectionId, academicYearId);
  if (!allowed) {
    throw new ForbiddenError(
      `Access denied: Only the designated active class teacher or school administrator can mark daily attendance for this section`
    );
  }
}

export function canAdminCorrectAttendance(user: AuthenticatedUser, schoolId: string): boolean {
  if (user.role === "SUPER_ADMIN") return true;
  return user.role === "SCHOOL_ADMIN" && user.schoolId === schoolId;
}

export function assertAdminCorrectionAccess(user: AuthenticatedUser, schoolId: string): void {
  if (!canAdminCorrectAttendance(user, schoolId)) {
    throw new ForbiddenError(
      "Only school administrators are authorized to perform administrative attendance corrections"
    );
  }
}

export async function assertStudentAccess(
  user: AuthenticatedUser,
  studentId: string,
  academicYearId?: string
): Promise<void> {
  const allowed = await canAccessStudent(user, studentId, academicYearId);
  if (!allowed) {
    throw new ForbiddenError(
      `Access denied: You are not authorized to view or manage student '${studentId}'`
    );
  }
}

export function assertCanManageTeachingAssignments(
  user: AuthenticatedUser,
  schoolId: string
): void {
  if (!canManageTeachingAssignments(user, schoolId)) {
    throw new ForbiddenError(
      "Only school administrators are authorized to manage teaching assignments"
    );
  }
}

// ============================================================================
// Phase 11: Examination and Marks Management RBAC Services & Centralized Checks
// ============================================================================

export function canManageExams(user: AuthenticatedUser, schoolId: string): boolean {
  if (user.role === "SUPER_ADMIN") return true;
  return user.role === "SCHOOL_ADMIN" && user.schoolId === schoolId;
}

export function assertCanManageExams(user: AuthenticatedUser, schoolId: string): void {
  if (!canManageExams(user, schoolId)) {
    throw new ForbiddenError(
      "Only school administrators are authorized to create or configure examinations"
    );
  }
}

export async function canEnterSubjectMarks(
  user: AuthenticatedUser,
  schoolId: string,
  sectionId: string,
  subjectId: string,
  academicYearId?: string
): Promise<boolean> {
  if (user.role === "SUPER_ADMIN") return true;

  if (user.role === "SCHOOL_ADMIN") {
    return user.schoolId === schoolId;
  }

  if (user.role === "ACCOUNTANT") {
    return false;
  }

  if (user.role === "TEACHER" && user.schoolId === schoolId) {
    const assignments = await getTeacherActiveAssignments(schoolId, user.id, academicYearId);
    if (!assignments) return false;
    // Strict Subject-Teacher enforcement:
    // Only teachers with an ACTIVE SubjectTeacherAssignment for this exact subject-section can enter marks.
    // Class-teacher status alone DOES NOT grant marks entry!
    return assignments.subjectAssignments.some(
      (sa) => sa.sectionId === sectionId && sa.subjectId === subjectId
    );
  }

  return false;
}

export async function assertCanEnterSubjectMarks(
  user: AuthenticatedUser,
  schoolId: string,
  sectionId: string,
  subjectId: string,
  academicYearId?: string
): Promise<void> {
  const allowed = await canEnterSubjectMarks(user, schoolId, sectionId, subjectId, academicYearId);
  if (!allowed) {
    throw new ForbiddenError(
      `Access denied: You are not authorized to enter marks for subject '${subjectId}' in section '${sectionId}'`
    );
  }
}

export function canReviewMarks(user: AuthenticatedUser, schoolId: string): boolean {
  if (user.role === "SUPER_ADMIN") return true;
  return user.role === "SCHOOL_ADMIN" && user.schoolId === schoolId;
}

export function assertCanReviewMarks(user: AuthenticatedUser, schoolId: string): void {
  if (!canReviewMarks(user, schoolId)) {
    throw new ForbiddenError(
      "Only school administrators are authorized to review or approve examination marks"
    );
  }
}

export function canPublishResults(user: AuthenticatedUser, schoolId: string): boolean {
  if (user.role === "SUPER_ADMIN") return true;
  return user.role === "SCHOOL_ADMIN" && user.schoolId === schoolId;
}

export function assertCanPublishResults(user: AuthenticatedUser, schoolId: string): void {
  if (!canPublishResults(user, schoolId)) {
    throw new ForbiddenError(
      "Only school administrators are authorized to publish examination results"
    );
  }
}

export function canAdminCorrectMarks(user: AuthenticatedUser, schoolId: string): boolean {
  if (user.role === "SUPER_ADMIN") return true;
  return user.role === "SCHOOL_ADMIN" && user.schoolId === schoolId;
}

export function assertCanAdminCorrectMarks(user: AuthenticatedUser, schoolId: string): void {
  if (!canAdminCorrectMarks(user, schoolId)) {
    throw new ForbiddenError(
      "Only school administrators are authorized to perform administrative corrections on marks"
    );
  }
}

// ============================================================================
// Phase: Fees and Finance Management RBAC Services & Centralized Checks
// ============================================================================

export function canViewSchoolFees(user: AuthenticatedUser, schoolId: string): boolean {
  if (user.role === "TEACHER" || user.role === "STUDENT" || user.role === "PARENT") return false;
  if (user.role === "SUPER_ADMIN") return false;
  return (user.role === "SCHOOL_ADMIN" || user.role === "ACCOUNTANT") && user.schoolId === schoolId;
}

export function assertCanViewSchoolFees(user: AuthenticatedUser, schoolId: string): void {
  if (user.role === "SUPER_ADMIN") {
    throw new ForbiddenError(
      "Platform administrators cannot perform routine tenant finance operations without explicit school-scoped authorization"
    );
  }
  if (!canViewSchoolFees(user, schoolId)) {
    throw new ForbiddenError(
      "Only the school administrator or accountant of this school is authorized to access finance records"
    );
  }
}

export function canConfigureSchoolFees(user: AuthenticatedUser, schoolId: string): boolean {
  if (user.role !== "SCHOOL_ADMIN") return false;
  return user.schoolId === schoolId;
}

export function assertCanConfigureSchoolFees(user: AuthenticatedUser, schoolId: string): void {
  if (user.role === "SUPER_ADMIN") {
    throw new ForbiddenError(
      "Platform administrators cannot perform routine tenant finance operations without explicit school-scoped authorization"
    );
  }
  if (user.role === "ACCOUNTANT") {
    throw new ForbiddenError(
      "Accountants cannot configure fee heads, fee structures, or school-wide financial settings"
    );
  }
  if (!canConfigureSchoolFees(user, schoolId)) {
    throw new ForbiddenError(
      "Only the school administrator of this school is authorized to configure fee structures"
    );
  }
}

export function canGenerateInvoices(user: AuthenticatedUser, schoolId: string): boolean {
  if (user.role === "SUPER_ADMIN") return false;
  return (user.role === "SCHOOL_ADMIN" || user.role === "ACCOUNTANT") && user.schoolId === schoolId;
}

export function assertCanGenerateInvoices(user: AuthenticatedUser, schoolId: string): void {
  if (user.role === "SUPER_ADMIN") {
    throw new ForbiddenError(
      "Platform administrators cannot perform routine tenant finance operations without explicit school-scoped authorization"
    );
  }
  if (!canGenerateInvoices(user, schoolId)) {
    throw new ForbiddenError(
      "Only the school administrator or accountant of this school is authorized to generate invoices"
    );
  }
}

export function canCollectSchoolFees(user: AuthenticatedUser, schoolId: string): boolean {
  if (user.role === "SUPER_ADMIN") return false;
  return (user.role === "SCHOOL_ADMIN" || user.role === "ACCOUNTANT") && user.schoolId === schoolId;
}

export function assertCanCollectSchoolFees(user: AuthenticatedUser, schoolId: string): void {
  if (user.role === "SUPER_ADMIN") {
    throw new ForbiddenError(
      "Platform administrators cannot perform routine tenant finance operations without explicit school-scoped authorization"
    );
  }
  if (!canCollectSchoolFees(user, schoolId)) {
    throw new ForbiddenError(
      "Only the school administrator or accountant of this school is authorized to collect fees and issue receipts"
    );
  }
}

export function canApproveFeeAdjustments(user: AuthenticatedUser, schoolId: string): boolean {
  if (user.role !== "SCHOOL_ADMIN") return false;
  return user.schoolId === schoolId;
}

export function assertCanApproveFeeAdjustments(user: AuthenticatedUser, schoolId: string): void {
  if (user.role === "SUPER_ADMIN") {
    throw new ForbiddenError(
      "Platform administrators cannot perform routine tenant finance operations without explicit school-scoped authorization"
    );
  }
  if (user.role === "ACCOUNTANT") {
    throw new ForbiddenError(
      "Accountants cannot approve adjustments, concessions, or refunds without administrator authorization"
    );
  }
  if (!canApproveFeeAdjustments(user, schoolId)) {
    throw new ForbiddenError(
      "Only the school administrator of this school is authorized to approve concessions, adjustments, or refunds"
    );
  }
}

