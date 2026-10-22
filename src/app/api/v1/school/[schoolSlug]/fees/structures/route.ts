import { NextRequest } from "next/server";
import { apiHandler, RouteContext } from "@/lib/api-handler";
import { successResponse } from "@/lib/api-response";
import { BadRequestError } from "@/lib/errors";
import { requireAuth } from "@/lib/rbac";
import { resolveSchoolForFees, getFeeStructures, createFeeStructure } from "@/lib/fees";

type Context = RouteContext<{ schoolSlug: string }>;

export const GET = apiHandler(async (req: NextRequest, context?: Context) => {
  const params = await context?.params;
  const schoolSlug = params?.schoolSlug;
  if (!schoolSlug) throw new BadRequestError("Missing schoolSlug in route");

  const user = await requireAuth(req);
  const school = await resolveSchoolForFees(schoolSlug, user);

  const { searchParams } = new URL(req.url);
  const academicYearId = searchParams.get("academicYearId") || undefined;
  const classId = searchParams.get("classId") || undefined;

  const structures = await getFeeStructures(school.id, user, {
    academicYearId,
    classId,
  });

  return successResponse(structures);
});

export const POST = apiHandler(async (req: NextRequest, context?: Context) => {
  const params = await context?.params;
  const schoolSlug = params?.schoolSlug;
  if (!schoolSlug) throw new BadRequestError("Missing schoolSlug in route");

  const user = await requireAuth(req);
  const school = await resolveSchoolForFees(schoolSlug, user);

  const body = await req.json();
  const structure = await createFeeStructure(school.id, user, {
    academicYearId: body.academicYearId,
    classId: body.classId,
    name: body.name,
    description: body.description,
    frequency: body.frequency,
    dueDate: body.dueDate,
    items: body.items,
  });

  return successResponse(structure, undefined, 201);
});
