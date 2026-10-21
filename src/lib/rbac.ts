// Role Based Access Control
import { Role } from "@/generated/prisma/enums";
import { AuthenticatedUser, getAuthenticatedUser } from "./auth";
import { ForbiddenError, UnauthorizedError } from "./errors";
import { prisma } from "./prisma";
import { NextRequest } from "next/server";

export type Permission =
  // Platform permissions
  | "platform:manage"
  | "platform:view"
  | "school:create"
  | "registration:manage"
  | "registration:view"
  // School administration permissions
  | "school:manage"
  | "school:view"
  | "staff:manage"
  | "staff:view"
  | "invitation:create"
  | "invitation:view"
  | "invitation:revoke"
  // Student & Guardian permissions
  | "student:create"
  | "student:update"
  | "student:delete"
  | "student:view:all"
  | "student:view:own"
  | "guardian:manage"
  | "guardian:view"
  // Academic permissions
  | "academic:manage"
  | "academic:view"
  | "attendance:manage"
  | "attendance:view"
  | "grades:manage"
  | "grades:view"
  // Financial permissions
  | "fees:manage"
  | "fees:view"
  // Audit logs
  | "audit:view";

/**
 * Explicit mapping of roles to permitted actions.
 * Access is denied by default unless explicitly granted here.
 * Notice: We do NOT use an automatic role hierarchy where higher roles automatically inherit everything.
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
  ],
  ACCOUNTANT: ["fees:manage", "fees:view", "student:view:all", "school:view"],
  TEACHER: [
    "academic:view",
    "attendance:manage",
    "attendance:view",
    "grades:manage",
    "grades:view",
    "student:view:all",
    "school:view",
  ],
  PARENT: ["student:view:own", "attendance:view", "grades:view", "fees:view"],
  STUDENT: ["student:view:own", "academic:view", "attendance:view", "grades:view"],
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

  // Look up Guardian linked to user
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

  // Verify student identity matches authenticated user
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
