import { env } from "./env";
import { Role } from "../../generated/prisma/enums";
import { NextRequest } from "next/server";
import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";

export const SESSION_COOKIE_NAME = "session_token";
export const SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days in seconds

export type SessionPayload = {
  userId: string;
  schoolId: string;
  role: Role;
  email?: string | null;
  phone?: string | null;
};

const secretKey = new TextEncoder().encode(env.APP_SECRET);

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return await new SignJWT({
    schoolId: payload.schoolId,
    role: payload.role,
    email: payload.email ?? null,
    phone: payload.phone ?? null,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(payload.userId)
    .setIssuedAt()
    .setExpirationTime(SESSION_COOKIE_MAX_AGE)
    .sign(secretKey);
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: ["HS256"],
    });

    const userId = payload.sub as string;
    const schoolId = payload.schoolId as string;
    const role = payload.role as Role | undefined;

    if (!userId || !schoolId || !role) {
      return null;
    }

    const email = payload.email as string | null | undefined;
    const phone = payload.phone as string | null | undefined;
    return {
      userId,
      schoolId,
      role,
      email,
      phone,
    };
  } catch {
    return null;
  }
}

export async function getSession(req?: NextRequest | Request): Promise<SessionPayload | null> {
  if (req) {
    const userIdHeader = req.headers.get("x-user-id");
    const schoolIdHeader = req.headers.get("x-school-id");
    const roleHeader = req.headers.get("x-role") as Role | null;

    if (userIdHeader && schoolIdHeader && roleHeader) {
      return {
        userId: userIdHeader,
        schoolId: schoolIdHeader,
        role: roleHeader,
      };
    }
  }

  let token: string | undefined;

  if (req && "cookies" in req && typeof req.cookies.get === "function") {
    token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  } else {
    try {
      const cookieStore = await cookies();
      token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    } catch {
      token = undefined;
    }
  }

  if (!token) return null;

  return await verifySessionToken(token);
}
