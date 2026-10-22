import { NextRequest } from "next/server";
import { apiHandler, RouteContext } from "@/lib/api-handler";
import { successResponse } from "@/lib/api-response";
import { BadRequestError } from "@/lib/errors";
import { requireAuth } from "@/lib/rbac";
import { resolveSchoolForExam, configureExamClassesAndSubjects } from "@/lib/exam";

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
  const configured = await configureExamClassesAndSubjects(school.id, user, examId, {
    classIds: body.classIds,
    subjectConfigs: body.subjectConfigs,
  });

  return successResponse(configured);
});
