import { z } from "zod";
import type { SourceKey } from "@/lib/validators";

export const redditConfigSchema = z.object({
  subreddits: z.array(z.string().min(1, "Subreddit name is required")),
});

export const xConfigSchema = z.object({
  handles: z.array(z.string().min(1, "Handle is required")),
});

export const linkedinConfigSchema = z.object({
  industries: z.array(z.string().min(1, "Industry is required")),
});

export const rssConfigSchema = z.object({
  feeds: z.array(z.string().min(1, "Feed URL is required")),
});

export type RedditConfigValues = z.infer<typeof redditConfigSchema>;
export type XConfigValues = z.infer<typeof xConfigSchema>;
export type LinkedinConfigValues = z.infer<typeof linkedinConfigSchema>;
export type RssConfigValues = z.infer<typeof rssConfigSchema>;

export const sourceConfigSchemas = {
  reddit: redditConfigSchema,
  x: xConfigSchema,
  linkedin: linkedinConfigSchema,
  rss: rssConfigSchema,
} as const;

export type SourceConfigValues =
  | RedditConfigValues
  | XConfigValues
  | LinkedinConfigValues
  | RssConfigValues;

export function parseSourceConfig(
  key: "reddit",
  config: unknown
): RedditConfigValues;
export function parseSourceConfig(key: "x", config: unknown): XConfigValues;
export function parseSourceConfig(
  key: "linkedin",
  config: unknown
): LinkedinConfigValues;
export function parseSourceConfig(key: "rss", config: unknown): RssConfigValues;
export function parseSourceConfig(
  key: SourceKey,
  config: unknown
): SourceConfigValues {
  const schema = sourceConfigSchemas[key];
  const input =
    config && typeof config === "object" && !Array.isArray(config)
      ? config
      : {};
  return schema.parse(input);
}

export function defaultSourceConfig(key: SourceKey): SourceConfigValues {
  switch (key) {
    case "reddit":
      return { subreddits: [] };
    case "x":
      return { handles: [] };
    case "linkedin":
      return { industries: [] };
    case "rss":
      return { feeds: [] };
  }
}

export function configSummary(key: SourceKey, config: unknown): string {
  switch (key) {
    case "reddit": {
      const parsed = parseSourceConfig("reddit", config);
      return parsed.subreddits.length === 0
        ? "No subreddits configured"
        : `${parsed.subreddits.length} subreddit${parsed.subreddits.length === 1 ? "" : "s"}`;
    }
    case "x": {
      const parsed = parseSourceConfig("x", config);
      return parsed.handles.length === 0
        ? "No handles configured"
        : `${parsed.handles.length} handle${parsed.handles.length === 1 ? "" : "s"}`;
    }
    case "linkedin": {
      const parsed = parseSourceConfig("linkedin", config);
      return parsed.industries.length === 0
        ? "No industries configured"
        : `${parsed.industries.length} ${parsed.industries.length === 1 ? "industry" : "industries"}`;
    }
    case "rss": {
      const parsed = parseSourceConfig("rss", config);
      return parsed.feeds.length === 0
        ? "No feeds configured"
        : `${parsed.feeds.length} feed${parsed.feeds.length === 1 ? "" : "s"}`;
    }
  }
}

export function isKnownSourceKey(key: string): key is SourceKey {
  return key in sourceConfigSchemas;
}

export function safeConfigSummary(key: string, config: unknown): string {
  if (!isKnownSourceKey(key)) return "Setup not available";
  try {
    return configSummary(key, config);
  } catch {
    return "Not configured";
  }
}

export const platformLabels: Record<SourceKey, string> = {
  reddit: "Reddit",
  x: "X (Twitter)",
  linkedin: "LinkedIn",
  rss: "RSS / Feeds",
};
