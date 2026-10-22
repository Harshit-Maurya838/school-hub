import { NextRequest } from "next/server";
import { apiHandler, RouteContext } from "@/lib/api-handler";
import { successResponse } from "@/lib/api-response";
import { BadRequestError } from "@/lib/errors";
import { requireAuth } from "@/lib/rbac";
import { resolveSchoolForFees, getFeeStructureById, updateFeeStructure } from "@/lib/fees";

type Context = RouteContext<{ schoolSlug: string; structureId: string }>;

export const GET = apiHandler(async (req: NextRequest, context?: Context) => {
  const params = await context?.params;
  const schoolSlug = params?.schoolSlug;
  const structureId = params?.structureId;
  if (!schoolSlug || !structureId)
    throw new BadRequestError("Missing required parameters in route");

  const user = await requireAuth(req);
  const school = await resolveSchoolForFees(schoolSlug, user);

  const structure = await getFeeStructureById(school.id, user, structureId);
  return successResponse(structure);
});

export const PATCH = apiHandler(async (req: NextRequest, context?: Context) => {
  const params = await context?.params;
  const schoolSlug = params?.schoolSlug;
  const structureId = params?.structureId;
  if (!schoolSlug || !structureId)
    throw new BadRequestError("Missing required parameters in route");

  const user = await requireAuth(req);
  const school = await resolveSchoolForFees(schoolSlug, user);

  const body = await req.json();
  const updated = await updateFeeStructure(school.id, user, structureId, {
    name: body.name,
    description: body.description,
    frequency: body.frequency,
    dueDate: body.dueDate,
    isActive: body.isActive,
    items: body.items,
  });

  return successResponse(updated);
});
