import { prisma } from "./prisma";
import { ForbiddenError } from "./errors";

// Every model carrying a schoolId, in Prisma's PascalCase model naming. SchoolRegistration is
// platform-scoped (its schoolId is only set after approval), so it is deliberately excluded.
export const TENANT_MODELS = [
  "User",
  "AuditLog",
  "AcademicYear",
  "Class",
  "Section",
  "Subject",
  "Student",
  "Guardian",
  "StudentGuardian",
  "Enrollment",
  "Invitation",
  "TeacherProfile",
  "ClassTeacherAssignment",
  "SubjectTeacherAssignment",
  "AttendanceRegister",
  "AttendanceCorrection",
  "Exam",
  "ExamClass",
  "ExamSubjectConfig",
  "ExamSectionSubject",
  "StudentExamMark",
  "ExamMarkCorrection",
  "FeeHead",
  "FeeStructure",
  "FeeStructureItem",
  "Invoice",
  "InvoiceItem",
  "Payment",
  "FeeAdjustment",
  "Refund",
  "SchoolProfile",
] as const;

export type TenantModel = (typeof TENANT_MODELS)[number];

export function verifyEntitiesBelongToTenant(
  schoolId: string,
  entities: Array<{ id?: string; schoolId?: string | null }>
): void {
  for (const entity of entities) {
    if (entity.schoolId && entity.schoolId !== schoolId) {
      throw new ForbiddenError(
        `Cross-tenant integrity violation: related record belongs to a different school`
      );
    }
  }
}

function sanitizeUpdateData(data: Record<string, unknown>, schoolId: string): void {
  if ("schoolId" in data) {
    if (data.schoolId !== schoolId) {
      throw new ForbiddenError("Cannot transfer record across tenants by modifying schoolId");
    }
  }
}

const tenantModels = new Set<string>(TENANT_MODELS);

/**
 * Prisma client that forces every top-level query on a tenant model into one school.
 * shortcut: nested relation reads/writes (include, nested create/connect) and raw SQL are not
 * rewritten; filter those by schoolId explicitly, or extend this when a caller needs them.
 */
export function createTenantPrisma(schoolId: string) {
  if (!schoolId || typeof schoolId !== "string" || schoolId.trim() === "") {
    throw new ForbiddenError("A valid schoolId is required for tenant database operations");
  }

  const normalizedSchoolId = schoolId.trim();

  const scope = (args: Record<string, unknown>) => {
    args.where = { ...((args.where as object) || {}), schoolId: normalizedSchoolId };
  };

  const stamp = (data: unknown) => {
    if (!data) return;
    const record = data as Record<string, unknown>;
    if (record.schoolId && record.schoolId !== normalizedSchoolId) {
      throw new ForbiddenError("Cannot create records under another school's tenant");
    }
    record.schoolId = normalizedSchoolId;
  };

  return prisma.$extends({
    name: "tenantIsolation",
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!tenantModels.has(model)) return query(args);
          const a = (args ?? {}) as Record<string, unknown>;

          switch (operation) {
            case "create":
              stamp(a.data);
              break;
            case "createMany":
            case "createManyAndReturn":
              (Array.isArray(a.data) ? a.data : [a.data]).forEach(stamp);
              break;
            case "upsert":
              scope(a);
              stamp(a.create);
              if (a.update)
                sanitizeUpdateData(a.update as Record<string, unknown>, normalizedSchoolId);
              break;
            case "update":
            case "updateMany":
            case "updateManyAndReturn":
              scope(a);
              if (a.data) sanitizeUpdateData(a.data as Record<string, unknown>, normalizedSchoolId);
              break;
            default:
              // findUnique/First/Many (+OrThrow), count, aggregate, groupBy, delete, deleteMany
              scope(a);
          }
          return query(a as typeof args);
        },
      },
    },
  });
}
