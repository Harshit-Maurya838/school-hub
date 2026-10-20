import { NextRequest } from "next/server";
import { z } from "zod";
import { apiHandler } from "@/lib/api-handler";
import { successResponse } from "@/lib/api-response";
import { submitSchoolRegistration } from "@/lib/school-registration";

const registrationSchema = z.object({
  schoolName: z.string().min(2, "School name must be at least 2 characters"),
  schoolCode: z.string().min(2, "School code must be at least 2 characters"),
  desiredSlug: z.string().min(2, "Desired slug must be at least 2 characters"),
  adminName: z.string().min(2, "Contact administrator name is required"),
  adminEmail: z
    .string()
    .transform((val) => val.trim().toLowerCase())
    .pipe(z.string().email("Invalid email address")),
  adminPhone: z.string().optional(),
});

export const POST = apiHandler(async (req: NextRequest) => {
  const body = await req.json().catch(() => ({}));
  const validated = registrationSchema.parse(body);

  const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
  const userAgent = req.headers.get("user-agent") || "unknown";

  const result = await submitSchoolRegistration({
    schoolName: validated.schoolName,
    schoolCode: validated.schoolCode,
    desiredSlug: validated.desiredSlug,
    adminName: validated.adminName,
    adminEmail: validated.adminEmail,
    adminPhone: validated.adminPhone,
    ipAddress,
    userAgent,
  });

  return successResponse(
    {
      message: "Application submitted. Please check your contact email to verify your address.",
      registration: result.registration,
      verificationUrl: result.verificationUrl,
    },
    undefined,
    201
  );
});
