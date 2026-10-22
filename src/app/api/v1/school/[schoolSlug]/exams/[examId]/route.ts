import { NextRequest } from "next/server";
import { apiHandler, RouteContext } from "@/lib/api-handler";
import { successResponse } from "@/lib/api-response";
import { BadRequestError } from "@/lib/errors";
import { requireAuth } from "@/lib/rbac";
import { resolveSchoolForExam, getExamDetails, updateExam, updateExamStatus } from "@/lib/exam";

type Context = RouteContext<{ schoolSlug: string; examId: string }>;

export const GET = apiHandler(async (req: NextRequest, context?: Context) => {
  const params = await context?.params;
  const schoolSlug = params?.schoolSlug;
  const examId = params?.examId;

  if (!schoolSlug || !examId) {
    throw new BadRequestError("Missing required route parameters");
  }

  const user = await requireAuth(req);
  const school = await resolveSchoolForExam(schoolSlug, user);

  const exam = await getExamDetails(school.id, user, examId);
  return successResponse(exam);
});

export const PATCH = apiHandler(async (req: NextRequest, context?: Context) => {
  const params = await context?.params;
  const schoolSlug = params?.schoolSlug;
  const examId = params?.examId;

  if (!schoolSlug || !examId) {
    throw new BadRequestError("Missing required route parameters");
  }

  const user = await requireAuth(req);
  const school = await resolveSchoolForExam(schoolSlug, user);

  const body = await req.json();

  if (body.status !== undefined) {
    const updated = await updateExamStatus(school.id, user, examId, body.status);
    return successResponse(updated);
  }

  const updated = await updateExam(school.id, user, examId, {
    name: body.name,
    type: body.type,
    description: body.description,
    startDate: body.startDate,
    endDate: body.endDate,
  });

  return successResponse(updated);
});
