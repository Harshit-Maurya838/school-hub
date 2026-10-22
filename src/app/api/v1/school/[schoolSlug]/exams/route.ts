import { NextRequest } from "next/server";
import { apiHandler, RouteContext } from "@/lib/api-handler";
import { successResponse } from "@/lib/api-response";
import { BadRequestError } from "@/lib/errors";
import { requireAuth } from "@/lib/rbac";
import { resolveSchoolForExam, getSchoolExams, createExam } from "@/lib/exam";

type Context = RouteContext<{ schoolSlug: string }>;

export const GET = apiHandler(async (req: NextRequest, context?: Context) => {
  const params = await context?.params;
  const schoolSlug = params?.schoolSlug;
  if (!schoolSlug) throw new BadRequestError("Missing schoolSlug in route");

  const user = await requireAuth(req);
  const school = await resolveSchoolForExam(schoolSlug, user);

  const { searchParams } = new URL(req.url);
  const academicYearId = searchParams.get("academicYearId") || undefined;

  const exams = await getSchoolExams(school.id, user, academicYearId);
  return successResponse(exams);
});

export const POST = apiHandler(async (req: NextRequest, context?: Context) => {
  const params = await context?.params;
  const schoolSlug = params?.schoolSlug;
  if (!schoolSlug) throw new BadRequestError("Missing schoolSlug in route");

  const user = await requireAuth(req);
  const school = await resolveSchoolForExam(schoolSlug, user);

  const body = await req.json();
  const exam = await createExam(school.id, user, {
    name: body.name,
    type: body.type,
    description: body.description,
    startDate: body.startDate,
    endDate: body.endDate,
    academicYearId: body.academicYearId,
  });

  return successResponse(exam, undefined, 201);
});
