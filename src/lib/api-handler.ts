import { NextRequest, NextResponse } from "next/server";
import { errorResponse } from "./api-response";
import { AppError } from "./errors";
import { ZodError } from "zod";
import { logger } from "./logger";

type RouteHandler<T> = (
  req: NextRequest,
  context?: {
    params?: Record<string, string | string[]>;
  }
) => Promise<NextResponse<T>> | NextResponse;

export function apiHandler<T>(handler: RouteHandler<T>) {
  return async (
    req: NextRequest,
    context?: { params?: Record<string, string | string[]> }
  ): Promise<NextResponse> => {
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
        return errorResponse(
          {
            code: "VALIDATION_ERROR",
            message: "Validation failed",
          },
          422
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
