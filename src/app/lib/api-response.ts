import { NextResponse } from 'next/server'

export interface ApiResponseSuccess<T>{
  data: T;
  meta?: Record<string, any>; 
}

export interface ApiErrorPayload{
    code: string;
    message: string;
    details?: Record<string, any>;
}

export interface ApiResponseError {
  error: ApiErrorPayload;
}

export type ApiResponse<T> = ApiResponseSuccess<T> | ApiResponseError;

export function errorResponse(
  error: ApiErrorPayload,
  status: number = 500
): NextResponse<ApiResponseError> {
  return NextResponse.json({ error }, { status });
}