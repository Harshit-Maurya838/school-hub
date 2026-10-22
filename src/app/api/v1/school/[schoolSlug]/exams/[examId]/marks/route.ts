import { NextRequest } from "next/server";
import { apiHandler, RouteContext } from "@/lib/api-handler";
import { successResponse } from "@/lib/api-response";
import { BadRequestError } from "@/lib/errors";
import { requireAuth } from "@/lib/rbac";
import { resolveSchoolForExam, getExamMarksRoster } from "@/lib/exam";

type Context = RouteContext<{ schoolSlug: string; examId: string }>;

export const GET = apiHandler(async (req: NextRequest, context?: Context) => {
  const params = await context?.params;
  const schoolSlug = params?.schoolSlug;
  const examId = params?.examId;

  if (!schoolSlug || !examId) {
    throw new BadRequestError("Missing required route parameters");
  }

  const { searchParams } = new URL(req.url);
  const sectionId = searchParams.get("sectionId");
  const subjectId = searchParams.get("subjectId");

  if (!sectionId || !subjectId) {
    throw new BadRequestError("Query parameters 'sectionId' and 'subjectId' are required");
  }

  const user = await requireAuth(req);
  const school = await resolveSchoolForExam(schoolSlug, user);

  const roster = await getExamMarksRoster(school.id, user, examId, sectionId, subjectId);
  return successResponse(roster);
});
