import { NextRequest, NextResponse } from "next/server";
import { errorResponse } from "./api-response";

type RouteHandler<T> = (
    req: NextRequest,
    context?: {
        params?: Record<string, string | string[]>;
    }
) => Promise<NextResponse<T>> | NextResponse;

export function apiHandler<T>(handler: RouteHandler<T>) {
    return async(
        req: NextRequest,
        context?: { params?: Record<string, string | string[]> }
    ): Promise<NextResponse> => {
        try{
            return await handler(req, context);
        }catch(err: unknown){
            if(err instanceof Error){
                console.error(err);
            }
        }
        return errorResponse(
            {
                code: "internal_server_error",
                message: "An unexpected error occurred."
            },
            500
        );
    };
}