import { EngineError } from "../errors";
import type { Logger } from "../logger";

// HTTP helper with timeout, bounded retries, and exponential backoff. Used by
// every outbound call (search providers, feed fetching, native discovery) so
// timeout/retry behaviour is consistent and testable.

export interface FetchOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
  maxRetries?: number;
  userAgent?: string;
  logger?: Logger;
}

const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function fetchWithRetry(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  const {
    method = "GET",
    headers = {},
    body,
    timeoutMs = 15000,
    maxRetries = 2,
    userAgent,
    logger,
  } = options;

  const finalHeaders: Record<string, string> = { ...headers };
  if (userAgent && !finalHeaders["User-Agent"]) {
    finalHeaders["User-Agent"] = userAgent;
  }

  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        method,
        headers: finalHeaders,
        body,
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (RETRYABLE_STATUS.has(res.status) && attempt < maxRetries) {
        logger?.warn("http retryable status", {
          url,
          status: res.status,
          attempt,
        });
        await sleep(backoffMs(attempt));
        continue;
      }
      return res;
    } catch (error) {
      clearTimeout(timer);
      lastError = error;
      const aborted = error instanceof Error && error.name === "AbortError";
      logger?.warn("http request failed", {
        url,
        attempt,
        aborted,
        error: error instanceof Error ? error.message : String(error),
      });
      if (attempt < maxRetries) {
        await sleep(backoffMs(attempt));
        continue;
      }
      if (aborted) {
        throw new EngineError("UPSTREAM_TIMEOUT", `Request to ${url} timed out`, {
          url,
          timeoutMs,
        });
      }
      throw new EngineError(
        "PROVIDER_ERROR",
        `Request to ${url} failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
        { url }
      );
    }
  }
  // Unreachable, but satisfies the type checker.
  throw new EngineError("PROVIDER_ERROR", `Request to ${url} failed`, {
    url,
    cause: lastError instanceof Error ? lastError.message : String(lastError),
  });
}

function backoffMs(attempt: number): number {
  return Math.min(2000, 200 * 2 ** attempt);
}

export async function fetchText(
  url: string,
  options: FetchOptions = {}
): Promise<string> {
  const res = await fetchWithRetry(url, options);
  if (!res.ok) {
    throw new EngineError("PROVIDER_ERROR", `GET ${url} returned ${res.status}`, {
      url,
      status: res.status,
    });
  }
  return res.text();
}

export async function fetchJson<T>(
  url: string,
  options: FetchOptions = {}
): Promise<T> {
  const res = await fetchWithRetry(url, options);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new EngineError(
      "PROVIDER_ERROR",
      `${options.method ?? "GET"} ${url} returned ${res.status}`,
      { url, status: res.status, body: text.slice(0, 500) }
    );
  }
  return (await res.json()) as T;
}
