/**
 * Client-safe role UI utilities and permissions
 */

export type AppRole =
  | "SUPER_ADMIN"
  | "SCHOOL_ADMIN"
  | "TEACHER"
  | "ACCOUNTANT"
  | "PARENT"
  | "STUDENT";

export function getRoleDisplayName(role?: string): string {
  switch (role) {
    case "SUPER_ADMIN":
      return "Platform Admin";
    case "SCHOOL_ADMIN":
      return "School Admin";
    case "TEACHER":
      return "Teacher";
    case "ACCOUNTANT":
      return "Accountant";
    case "PARENT":
      return "Parent / Guardian";
    case "STUDENT":
      return "Student";
    default:
      return role || "User";
  }
}

export function getRoleTheme(role?: string): {
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  avatarBg: string;
} {
  switch (role) {
    case "SUPER_ADMIN":
      return {
        badgeBg: "bg-purple-50",
        badgeText: "text-purple-700",
        badgeBorder: "border-purple-200",
        avatarBg: "from-purple-700 to-indigo-600",
      };
    case "SCHOOL_ADMIN":
      return {
        badgeBg: "bg-emerald-50",
        badgeText: "text-emerald-800",
        badgeBorder: "border-emerald-200",
        avatarBg: "from-emerald-700 to-teal-500",
      };
    case "TEACHER":
      return {
        badgeBg: "bg-blue-50",
        badgeText: "text-blue-700",
        badgeBorder: "border-blue-200",
        avatarBg: "from-blue-600 to-sky-500",
      };
    case "ACCOUNTANT":
      return {
        badgeBg: "bg-amber-50",
        badgeText: "text-amber-800",
        badgeBorder: "border-amber-200",
        avatarBg: "from-amber-600 to-yellow-500",
      };
    default:
      return {
        badgeBg: "bg-slate-100",
        badgeText: "text-slate-700",
        badgeBorder: "border-slate-200",
        avatarBg: "from-slate-700 to-slate-500",
      };
  }
}

// Capability checks for UI conditional rendering
export function canManageSchool(role?: string): boolean {
  return role === "SUPER_ADMIN" || role === "SCHOOL_ADMIN";
}

export function canManageStudents(role?: string): boolean {
  return role === "SUPER_ADMIN" || role === "SCHOOL_ADMIN";
}

export function canViewStudents(role?: string): boolean {
  return (
    role === "SUPER_ADMIN" ||
    role === "SCHOOL_ADMIN" ||
    role === "TEACHER" ||
    role === "ACCOUNTANT"
  );
}

export function canManageAcademics(role?: string): boolean {
  return role === "SUPER_ADMIN" || role === "SCHOOL_ADMIN";
}

export function canViewAcademics(role?: string): boolean {
  return (
    role === "SUPER_ADMIN" ||
    role === "SCHOOL_ADMIN" ||
    role === "TEACHER" ||
    role === "STUDENT"
  );
}

export function canManageStaff(role?: string): boolean {
  return role === "SUPER_ADMIN" || role === "SCHOOL_ADMIN";
}

export function canManageSettings(role?: string): boolean {
  return role === "SUPER_ADMIN" || role === "SCHOOL_ADMIN";
}

export function canTakeAttendance(role?: string): boolean {
  return role === "SUPER_ADMIN" || role === "SCHOOL_ADMIN" || role === "TEACHER";
}

export function canManageFees(role?: string): boolean {
  return role === "SUPER_ADMIN" || role === "SCHOOL_ADMIN" || role === "ACCOUNTANT";
}
