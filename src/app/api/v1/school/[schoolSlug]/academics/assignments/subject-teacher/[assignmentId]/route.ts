import { NextRequest } from "next/server";
import { apiHandler, RouteContext } from "@/lib/api-handler";
import { successResponse } from "@/lib/api-response";
import { resolveSchoolAndAuthorize } from "@/lib/academics";
import { BadRequestError } from "@/lib/errors";
import { removeSubjectTeacherAssignment } from "@/lib/teaching-assignments";

type Context = RouteContext<{ schoolSlug: string; assignmentId: string }>;

export const DELETE = apiHandler(async (req: NextRequest, context?: Context) => {
  const params = await context?.params;
  const schoolSlug = params?.schoolSlug;
  const assignmentId = params?.assignmentId;

  if (!schoolSlug || !assignmentId) {
    throw new BadRequestError("Missing schoolSlug or assignmentId in route");
  }

  const { school, user } = await resolveSchoolAndAuthorize(req, schoolSlug, "write");

  const cancelled = await removeSubjectTeacherAssignment({
    schoolId: school.id,
    assignmentId,
    actorUserId: user.id,
  });

  return successResponse({ cancelled });
});
