import { NextRequest } from "next/server";
import { z } from "zod";
import { apiHandler, RouteContext } from "@/lib/api-handler";
import { successResponse } from "@/lib/api-response";
import { BadRequestError } from "@/lib/errors";
import { correctAttendanceRegister, resolveSchoolAndAuthorizeAttendance } from "@/lib/attendance";

const correctRegisterSchema = z.object({
  registerId: z.string().min(1, "Register ID is required"),
  reason: z.string().min(5, "Correction reason is mandatory and must be at least 5 characters"),
  updates: z
    .array(
      z.object({
        studentId: z.string().min(1, "Student ID is required"),
        status: z.enum(["PRESENT", "ABSENT", "LATE", "EXCUSED"]),
        remarks: z.string().nullable().optional(),
      })
    )
    .min(1, "At least one student record update must be provided"),
});

type Context = RouteContext<{ schoolSlug: string }>;

export const POST = apiHandler(async (req: NextRequest, context?: Context) => {
  const params = await context?.params;
  const schoolSlug = params?.schoolSlug;

  if (!schoolSlug) {
    throw new BadRequestError("Missing schoolSlug in route");
  }

  const { school, user } = await resolveSchoolAndAuthorizeAttendance(req, schoolSlug, "admin");
  const json = await req.json();
  const parsed = correctRegisterSchema.parse(json);

  const result = await correctAttendanceRegister(school.id, user, {
    registerId: parsed.registerId,
    reason: parsed.reason,
    updates: parsed.updates,
  });

  return successResponse(result, {
    message: "Administrative correction applied and audited successfully",
  });
});
