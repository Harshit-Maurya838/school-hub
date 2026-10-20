import { NextRequest } from "next/server";
import { apiHandler, RouteContext } from "@/lib/api-handler";
import { successResponse } from "@/lib/api-response";
import { BadRequestError } from "@/lib/errors";
import { resolveStudentSchoolAndAuthorize, restoreStudent } from "@/lib/students";

type Context = RouteContext<{ schoolSlug: string; studentId: string }>;

export const POST = apiHandler(async (req: NextRequest, context?: Context) => {
  const params = await context?.params;
  const schoolSlug = params?.schoolSlug;
  const studentId = params?.studentId;

  if (!schoolSlug || !studentId) {
    throw new BadRequestError("Missing required route parameters");
  }

  const { school, user } = await resolveStudentSchoolAndAuthorize(req, schoolSlug, "write");

  const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip");
  const userAgent = req.headers.get("user-agent");

  const student = await restoreStudent(school.id, studentId, {
    userId: user.id,
    ipAddress,
    userAgent,
  });

  return successResponse({
    success: true,
    message: "Student record restored successfully",
    student,
  });
});
