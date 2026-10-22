import { env } from "@/lib/env";
import { Role } from "@/generated/prisma/enums";
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const SESSION_COOKIE_NAME = "session_token";
export const SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days in seconds

export type SessionPayload = {
  userId: string;
  schoolId: string | null;
  role: Role;
  email?: string | null;
  phone?: string | null;
};

export type AuthenticatedUser = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: Role;
  schoolId: string | null;
  isActive: boolean;
};

const secretKey = new TextEncoder().encode(env.APP_SECRET);

export function getSessionCookieOptions() {
  return {
    name: SESSION_COOKIE_NAME,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_COOKIE_MAX_AGE,
  };
}

/**
 * Creates a signed JWT session token with HS256.
 */
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
    .setExpirationTime(`${SESSION_COOKIE_MAX_AGE}s`)
    .sign(secretKey);
}

/**
 * Cryptographically verifies the session JWT token.
 * Returns null if token is invalid, expired, or malformed.
 */
export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: ["HS256"],
    });

    const userId = payload.sub;
    const role = payload.role as Role | undefined;

    if (!userId || !role) {
      return null;
    }

    // schoolId can be null for SUPER_ADMIN, but must be string or null
    const rawSchoolId = payload.schoolId;
    const schoolId = typeof rawSchoolId === "string" ? rawSchoolId : null;

    const email = typeof payload.email === "string" ? payload.email : null;
    const phone = typeof payload.phone === "string" ? payload.phone : null;

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

/**
 * Extracts and verifies the session from cookies.
 * NO trust arbitrary client-supplied request headers.
 */
export async function getSession(req?: NextRequest | Request): Promise<SessionPayload | null> {
  let token: string | undefined;

  if (req && "cookies" in req && typeof (req as NextRequest).cookies?.get === "function") {
    token = (req as NextRequest).cookies.get(SESSION_COOKIE_NAME)?.value;
  } else if (req && req.headers) {
    const cookieHeader = req.headers.get("cookie");
    if (cookieHeader) {
      const match = cookieHeader
        .split(";")
        .map((c) => c.trim())
        .find((c) => c.startsWith(`${SESSION_COOKIE_NAME}=`));
      if (match) {
        token = match.substring(`${SESSION_COOKIE_NAME}=`.length);
      }
    }
  }

  if (!token) {
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

/**
 * Validates the session and fetches the active user record directly from the database.
 * Rejects inactive accounts and accounts marked as deleted.
 */
export async function getAuthenticatedUser(
  req?: NextRequest | Request
): Promise<AuthenticatedUser | null> {
  const session = await getSession(req);
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      schoolId: true,
      isActive: true,
      deletedAt: true,
    },
  });

  if (!user || !user.isActive || user.deletedAt !== null) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    schoolId: user.schoolId,
    isActive: user.isActive,
  };
}

/**
 * Applies the session cookie onto a NextResponse.
 */
export function setSessionCookieOnResponse(response: NextResponse, token: string): void {
  const options = getSessionCookieOptions();
  response.cookies.set({
    name: options.name,
    value: token,
    httpOnly: options.httpOnly,
    secure: options.secure,
    sameSite: options.sameSite,
    path: options.path,
    maxAge: options.maxAge,
  });
}

/**
 * Clears the session cookie on a NextResponse.
 */
export function clearSessionCookieOnResponse(response: NextResponse): void {
  const options = getSessionCookieOptions();
  response.cookies.set({
    name: options.name,
    value: "",
    httpOnly: options.httpOnly,
    secure: options.secure,
    sameSite: options.sameSite,
    path: options.path,
    maxAge: 0,
  });
}
