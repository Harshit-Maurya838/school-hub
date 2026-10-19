import { NextRequest } from "next/server";
import { apiHandler } from "@/lib/api-handler";
import { successResponse } from "@/lib/api-response";
import { clearSessionCookieOnResponse, getSession } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";

export const POST = apiHandler(async (req: NextRequest) => {
  const session = await getSession(req);
  const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
  const userAgent = req.headers.get("user-agent") || "unknown";

  if (session) {
    await logAuditEvent({
      action: "AUTH_LOGOUT",
      entityType: "User",
      userId: session.userId,
      schoolId: session.schoolId,
      details: { email: session.email },
      ipAddress,
      userAgent,
    });
  }

  const response = successResponse({
    message: "Logged out successfully",
  });

  clearSessionCookieOnResponse(response);
  return response;
});
