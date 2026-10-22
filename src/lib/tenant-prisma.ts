import { prisma } from "./prisma";
import { ForbiddenError } from "./errors";

export const TENANT_MODELS = [
  "user",
  "auditLog",
  "academicYear",
  "class",
  "section",
  "subject",
  "student",
  "guardian",
  "studentGuardian",
  "enrollment",
  "invitation",
  "feeHead",
  "feeStructure",
  "feeStructureItem",
  "invoice",
  "invoiceItem",
  "payment",
  "feeAdjustment",
  "refund",
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

export function createTenantPrisma(schoolId: string) {
  if (!schoolId || typeof schoolId !== "string" || schoolId.trim() === "") {
    throw new ForbiddenError("A valid schoolId is required for tenant database operations");
  }

  const normalizedSchoolId = schoolId.trim();

  return prisma.$extends({
    name: "tenantIsolation",
    query: {
      $allModels: {
        async findMany({ model, args, query }) {
          if (TENANT_MODELS.includes(model.toLowerCase() as TenantModel)) {
            args.where = { ...(args.where || {}), schoolId: normalizedSchoolId };
          }
          return query(args);
        },
        async findFirst({ model, args, query }) {
          if (TENANT_MODELS.includes(model.toLowerCase() as TenantModel)) {
            args.where = { ...(args.where || {}), schoolId: normalizedSchoolId };
          }
          return query(args);
        },
        async findFirstOrThrow({ model, args, query }) {
          if (TENANT_MODELS.includes(model.toLowerCase() as TenantModel)) {
            args.where = { ...(args.where || {}), schoolId: normalizedSchoolId };
          }
          return query(args);
        },
        async count({ model, args, query }) {
          if (TENANT_MODELS.includes(model.toLowerCase() as TenantModel)) {
            args.where = { ...(args.where || {}), schoolId: normalizedSchoolId };
          }
          return query(args);
        },
        async create({ model, args, query }) {
          if (TENANT_MODELS.includes(model.toLowerCase() as TenantModel)) {
            const data = (args.data || {}) as Record<string, unknown>;
            if (data.schoolId && data.schoolId !== normalizedSchoolId) {
              throw new ForbiddenError("Cannot create records under another school's tenant");
            }
            data.schoolId = normalizedSchoolId;
            args.data = data as typeof args.data;
          }
          return query(args);
        },
        async createMany({ model, args, query }) {
          if (TENANT_MODELS.includes(model.toLowerCase() as TenantModel)) {
            if (Array.isArray(args.data)) {
              for (const item of args.data) {
                const record = item as Record<string, unknown>;
                if (record.schoolId && record.schoolId !== normalizedSchoolId) {
                  throw new ForbiddenError("Cannot bulk-create records for another tenant");
                }
                record.schoolId = normalizedSchoolId;
              }
            } else if (args.data) {
              (args.data as Record<string, unknown>).schoolId = normalizedSchoolId;
            }
          }
          return query(args);
        },
        async update({ model, args, query }) {
          if (TENANT_MODELS.includes(model.toLowerCase() as TenantModel)) {
            args.where = { ...(args.where || {}), schoolId: normalizedSchoolId };
            if (args.data) {
              sanitizeUpdateData(args.data as Record<string, unknown>, normalizedSchoolId);
            }
          }
          return query(args);
        },
        async updateMany({ model, args, query }) {
          if (TENANT_MODELS.includes(model.toLowerCase() as TenantModel)) {
            args.where = { ...(args.where || {}), schoolId: normalizedSchoolId };
            if (args.data) {
              sanitizeUpdateData(args.data as Record<string, unknown>, normalizedSchoolId);
            }
          }
          return query(args);
        },
        async delete({ model, args, query }) {
          if (TENANT_MODELS.includes(model.toLowerCase() as TenantModel)) {
            args.where = { ...(args.where || {}), schoolId: normalizedSchoolId };
          }
          return query(args);
        },
        async deleteMany({ model, args, query }) {
          if (TENANT_MODELS.includes(model.toLowerCase() as TenantModel)) {
            args.where = { ...(args.where || {}), schoolId: normalizedSchoolId };
          }
          return query(args);
        },
        async upsert({ model, args, query }) {
          if (TENANT_MODELS.includes(model.toLowerCase() as TenantModel)) {
            args.where = { ...(args.where || {}), schoolId: normalizedSchoolId };
            if (args.create) {
              (args.create as Record<string, unknown>).schoolId = normalizedSchoolId;
            }
            if (args.update) {
              sanitizeUpdateData(args.update as Record<string, unknown>, normalizedSchoolId);
            }
          }
          return query(args);
        },
      },
    },
  });
}
