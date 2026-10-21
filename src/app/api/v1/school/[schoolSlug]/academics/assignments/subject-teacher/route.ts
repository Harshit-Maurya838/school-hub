import { NextRequest } from "next/server";
import { apiHandler, RouteContext } from "@/lib/api-handler";
import { successResponse } from "@/lib/api-response";
import { resolveSchoolAndAuthorize } from "@/lib/academics";
import { BadRequestError } from "@/lib/errors";
import { assignSubjectTeacher } from "@/lib/teaching-assignments";

type Context = RouteContext<{ schoolSlug: string }>;

export const POST = apiHandler(async (req: NextRequest, context?: Context) => {
  const params = await context?.params;
  const schoolSlug = params?.schoolSlug;

  if (!schoolSlug) {
    throw new BadRequestError("Missing schoolSlug in route");
  }

  const { school, user } = await resolveSchoolAndAuthorize(req, schoolSlug, "write");
  const body = await req.json().catch(() => ({}));

  if (
    !body.academicYearId ||
    !body.classId ||
    !body.sectionId ||
    !body.subjectId ||
    !body.teacherProfileId
  ) {
    throw new BadRequestError(
      "academicYearId, classId, sectionId, subjectId, and teacherProfileId are required fields"
    );
  }

  const result = await assignSubjectTeacher({
    schoolId: school.id,
    academicYearId: body.academicYearId,
    classId: body.classId,
    sectionId: body.sectionId,
    subjectId: body.subjectId,
    teacherProfileId: body.teacherProfileId,
    periodsPerWeek: body.periodsPerWeek,
    notes: body.notes,
    actorUserId: user.id,
  });

  return successResponse(result, undefined, 201);
});
