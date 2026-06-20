// Engine error type and HTTP error-response helper.
//
// The wire error shape is fixed by 08_internal_api_contracts.md:
//   { "error": { "code": "...", "message": "...", "details": {} } }

export type ErrorCode =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "FEED_VALIDATION_FAILED"
  | "FEED_RESOLUTION_FAILED"
  | "PROVIDER_ERROR"
  | "UPSTREAM_TIMEOUT"
  | "INTERNAL";

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  NOT_FOUND: 404,
  FEED_VALIDATION_FAILED: 422,
  FEED_RESOLUTION_FAILED: 422,
  PROVIDER_ERROR: 502,
  UPSTREAM_TIMEOUT: 504,
  INTERNAL: 500,
};

export class EngineError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details: Record<string, unknown>;

  constructor(
    code: ErrorCode,
    message: string,
    details: Record<string, unknown> = {}
  ) {
    super(message);
    this.name = "EngineError";
    this.code = code;
    this.status = STATUS_BY_CODE[code];
    this.details = details;
  }
}

export interface WireErrorBody {
  error: {
    code: string;
    message: string;
    details: Record<string, unknown>;
  };
}

export function toWireError(err: unknown): {
  status: number;
  body: WireErrorBody;
} {
  if (err instanceof EngineError) {
    return {
      status: err.status,
      body: {
        error: { code: err.code, message: err.message, details: err.details },
      },
    };
  }
  const message = err instanceof Error ? err.message : String(err);
  return {
    status: 500,
    body: { error: { code: "INTERNAL", message, details: {} } },
  };
}
