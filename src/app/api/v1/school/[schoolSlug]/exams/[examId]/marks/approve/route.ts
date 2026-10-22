import { NextRequest } from "next/server";
import { apiHandler, RouteContext } from "@/lib/api-handler";
import { successResponse } from "@/lib/api-response";
import { BadRequestError } from "@/lib/errors";
import { requireAuth } from "@/lib/rbac";
import { resolveSchoolForExam, approveMarks } from "@/lib/exam";

type Context = RouteContext<{ schoolSlug: string; examId: string }>;

export const POST = apiHandler(async (req: NextRequest, context?: Context) => {
  const params = await context?.params;
  const schoolSlug = params?.schoolSlug;
  const examId = params?.examId;

  if (!schoolSlug || !examId) {
    throw new BadRequestError("Missing required route parameters");
  }

  const user = await requireAuth(req);
  const school = await resolveSchoolForExam(schoolSlug, user);

  const body = await req.json();
  const { sectionId, subjectId } = body;

  if (!sectionId || !subjectId) {
    throw new BadRequestError("Both 'sectionId' and 'subjectId' are required in request body");
  }

  const result = await approveMarks(school.id, user, examId, sectionId, subjectId);
  return successResponse(result);
});
