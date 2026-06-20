import { errorResponse, jsonOk } from "@/lib/rss-engine/api/errors";

export async function handleRoute<T>(
  handler: () => Promise<T>
): Promise<Response> {
  try {
    return jsonOk(await handler());
  } catch (error) {
    return errorResponse(error);
  }
}

export function parseBool(value: string | null): boolean | undefined {
  if (value === null) return undefined;
  return value === "true";
}

export function parseNumber(value: string | null): number | undefined {
  if (value === null || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

export function parseDate(value: string | null): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}
