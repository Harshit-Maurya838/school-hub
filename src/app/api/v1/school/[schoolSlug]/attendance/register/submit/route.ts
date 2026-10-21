import { NextRequest } from "next/server";
import { z } from "zod";
import { apiHandler, RouteContext } from "@/lib/api-handler";
import { successResponse } from "@/lib/api-response";
import { BadRequestError } from "@/lib/errors";
import { submitAttendanceRegister, resolveSchoolAndAuthorizeAttendance } from "@/lib/attendance";

const submitRegisterSchema = z.object({
  sectionId: z.string().min(1, "Section ID is required"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  academicYearId: z.string().optional(),
  notes: z.string().nullable().optional(),
  records: z.array(
    z.object({
      studentId: z.string().min(1, "Student ID is required"),
      status: z.enum(["PRESENT", "ABSENT", "LATE", "EXCUSED"]),
      remarks: z.string().nullable().optional(),
    })
  ),
});

type Context = RouteContext<{ schoolSlug: string }>;

export const POST = apiHandler(async (req: NextRequest, context?: Context) => {
  const params = await context?.params;
  const schoolSlug = params?.schoolSlug;

  if (!schoolSlug) {
    throw new BadRequestError("Missing schoolSlug in route");
  }

  const { school, user } = await resolveSchoolAndAuthorizeAttendance(req, schoolSlug, "mark");
  const json = await req.json();
  const parsed = submitRegisterSchema.parse(json);

  const result = await submitAttendanceRegister(school.id, user, {
    sectionId: parsed.sectionId,
    date: parsed.date,
    academicYearId: parsed.academicYearId,
    notes: parsed.notes,
    records: parsed.records,
  });

  return successResponse(result, {
    message: "Daily attendance register submitted and locked successfully",
  });
});
