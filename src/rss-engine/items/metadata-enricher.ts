import type { OriginalPlatform } from "../types";
import { TAG_DICTIONARY } from "../scoring/dictionaries";

// Platform inference + tag extraction. Keeps platform detection in one place so
// every code path (resolution, polling, discovery) classifies hosts the same
// way.

export function inferPlatform(
  url: string | undefined,
  fallback: OriginalPlatform = "unknown"
): OriginalPlatform {
  if (!url) return fallback;
  let host: string;
  try {
    host = new URL(url).host.toLowerCase();
  } catch {
    return fallback;
  }
  if (host.endsWith("substack.com")) return "substack";
  if (host.endsWith("reddit.com") || host.endsWith("redd.it")) return "reddit";
  if (
    host.endsWith("ycombinator.com") ||
    host.includes("hnrss") ||
    host === "news.ycombinator.com"
  ) {
    return "hackernews";
  }
  // News vs blog is a soft distinction; default unknown hosts to "blog" unless
  // an explicit non-unknown fallback is supplied.
  if (fallback !== "unknown") return fallback;
  return "blog";
}

export function extractTags(text: string, limit = 12): string[] {
  const haystack = text.toLowerCase();
  const tags = new Set<string>();
  for (const entry of TAG_DICTIONARY) {
    for (const phrase of entry.phrases) {
      if (haystack.includes(phrase)) {
        tags.add(entry.tag);
        break;
      }
    }
    if (tags.size >= limit) break;
  }
  return [...tags];
}
