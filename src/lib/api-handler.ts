import { NextRequest, NextResponse } from "next/server";
import { errorResponse } from "./api-response";
import { AppError } from "./errors";
import { ZodError } from "zod";
import { logger } from "./logger";

export type RouteContext<P = Record<string, string | string[]>> = {
  params?: Promise<P>;
};

type RouteHandler<T, P = Record<string, string | string[]>> = (
  req: NextRequest,
  context?: RouteContext<P>
) => Promise<NextResponse<T>> | NextResponse;

export function apiHandler<T, P = Record<string, string | string[]>>(handler: RouteHandler<T, P>) {
  return async (req: NextRequest, context?: RouteContext<P>): Promise<NextResponse> => {
    try {
      return await handler(req, context);
    } catch (err: unknown) {
      if (err instanceof AppError) {
        if (err.statusCode >= 500) {
          logger.error({ err, code: err.code }, err.message);
        } else {
          logger.warn({ code: err.code, message: err.message });
        }
        return errorResponse(
          {
            code: err.code,
            message: err.message,
          },
          err.statusCode
        );
      }

      if (err instanceof ZodError) {
        const firstIssue = err.issues[0]?.message || "Validation failed";
        return errorResponse(
          {
            code: "VALIDATION_ERROR",
            message: firstIssue,
          },
          422
        );
      }

      if (
        typeof err === "object" &&
        err !== null &&
        "code" in err &&
        (err as { code: unknown }).code === "P2002"
      ) {
        const target = (err as { meta?: { target?: string[] | string } }).meta?.target;
        let conflictField = "field";
        if (Array.isArray(target)) {
          conflictField = target.join(", ");
        } else if (typeof target === "string") {
          conflictField = target;
        }

        let descriptiveMessage = `A record with this ${conflictField} already exists.`;
        if (conflictField.includes("schoolCode")) {
          descriptiveMessage = "A school registration with this School Code already exists.";
        } else if (conflictField.includes("desiredSlug")) {
          descriptiveMessage = "A school registration with this URL Slug already exists.";
        } else if (conflictField.includes("adminEmail")) {
          descriptiveMessage = "A school registration with this Admin Email already exists.";
        }

        logger.warn(
          { conflictField, descriptiveMessage },
          "Prisma unique constraint conflict caught"
        );
        return errorResponse(
          {
            code: "CONFLICT",
            message: descriptiveMessage,
          },
          409
        );
      }

      logger.error({ err }, "Unhandled internal error occurred");
      return errorResponse(
        {
          code: "internal_server_error",
          message: "An unexpected error occurred.",
        },
        500
      );
    }
  };
}
