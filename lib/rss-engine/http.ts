import { rssEngineConfig } from "./config";
import { rssLogger } from "./logger";

export async function fetchWithRetry(
  url: string,
  init: RequestInit = {}
): Promise<Response> {
  const { fetchTimeoutMs, fetchRetries, userAgent } = rssEngineConfig();
  let lastError: unknown;

  for (let attempt = 0; attempt <= fetchRetries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), fetchTimeoutMs);
    try {
      const res = await fetch(url, {
        ...init,
        signal: controller.signal,
        headers: {
          "User-Agent": userAgent,
          ...(init.headers ?? {}),
        },
      });
      return res;
    } catch (error) {
      lastError = error;
      rssLogger.warn("fetch retry", { url, attempt, error: String(error) });
      if (attempt < fetchRetries) {
        await new Promise((r) => setTimeout(r, 250 * (attempt + 1)));
      }
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`Failed to fetch ${url}`);
}
