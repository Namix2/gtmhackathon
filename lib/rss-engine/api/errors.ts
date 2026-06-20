import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function errorResponse(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      },
      { status: error.status }
    );
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request payload",
          details: { issues: error.flatten() },
        },
      },
      { status: 400 }
    );
  }

  const message =
    error instanceof Error ? error.message : "Unexpected server error";
  return NextResponse.json(
    { error: { code: "INTERNAL_ERROR", message } },
    { status: 500 }
  );
}

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}
