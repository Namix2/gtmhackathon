import type { OriginalPlatform } from "./types";

/** All platforms included in discovery searches by default. */
export const ALL_PLATFORM_HINTS: OriginalPlatform[] = [
  "substack",
  "reddit",
  "hackernews",
  "blog",
  "news",
  "youtube",
  "podcast",
];

export const DEFAULT_DISCOVERY_MAX_RESULTS = 12;
export const DEFAULT_DISCOVERY_CONCURRENCY = 8;
export const DEFAULT_POLL_CONCURRENCY = 6;
export const FAST_DISCOVER_MAX_ITEMS_PER_FEED = 8;
