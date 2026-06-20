import { z } from "zod";

// Zod schemas for every internal API request (and key responses). These are the
// single source of truth for request validation across the API layer and tests.

export const sourceTypeSchema = z.enum([
  "native_rss",
  "rsshub",
  "rssbridge",
  "rss_app",
  "manual",
]);

export const originalPlatformSchema = z.enum([
  "substack",
  "reddit",
  "hackernews",
  "blog",
  "news",
  "unknown",
]);

export const platformHintSchema = z.enum([
  "substack",
  "reddit",
  "hackernews",
  "blog",
  "news",
]);

export const dateCategorySchema = z.enum(["recent", "trending", "evergreen"]);

export const providerSchema = z.enum(["exa", "tavily"]);

export const icpCategorySchema = z.enum(["persuader", "evaluator", "unknown"]);

// ---- POST /api/discovery/search -------------------------------------------

export const discoverySearchSchema = z.object({
  queryCategory: z.string().min(1),
  queries: z.array(z.string().min(1)).min(1),
  providers: z.array(providerSchema).min(1).default(["exa", "tavily"]),
  platformHints: z.array(platformHintSchema).default([]),
  dateWindowDays: z.number().int().positive().max(3650).optional(),
  maxResultsPerProvider: z.number().int().positive().max(200).default(25),
});
export type DiscoverySearchInput = z.infer<typeof discoverySearchSchema>;

// ---- POST /api/discovery/resolve-feed -------------------------------------

export const resolveFeedSchema = z.object({
  url: z.string().url(),
  platformHint: platformHintSchema.optional(),
  // e.g. "native_then_rsshub_then_rssbridge_then_rss_app"
  strategy: z.string().min(1).default("native_then_rsshub_then_rssbridge"),
});
export type ResolveFeedInput = z.infer<typeof resolveFeedSchema>;

// ---- POST /api/feeds -------------------------------------------------------

export const registerFeedSchema = z.object({
  sourceType: sourceTypeSchema,
  originalPlatform: originalPlatformSchema,
  feedUrl: z.string().url(),
  homepageUrl: z.string().url().optional(),
  title: z.string().optional(),
  queryCategory: z.string().optional(),
  dateCategory: z.string().optional(),
  pollingIntervalMinutes: z.number().int().positive().max(100000).optional(),
});
export type RegisterFeedInput = z.infer<typeof registerFeedSchema>;

// ---- GET /api/feeds --------------------------------------------------------

export const listFeedsQuerySchema = z.object({
  platform: originalPlatformSchema.optional(),
  active: z
    .union([z.literal("true"), z.literal("false")])
    .transform((v) => v === "true")
    .optional(),
  queryCategory: z.string().optional(),
  dateCategory: z.string().optional(),
});
export type ListFeedsQuery = z.infer<typeof listFeedsQuerySchema>;

// ---- GET /api/items --------------------------------------------------------

export const listItemsQuerySchema = z.object({
  q: z.string().optional(),
  platform: z.string().optional(),
  publishedAfter: z.string().optional(),
  limit: z.coerce.number().int().positive().max(500).default(50),
});
export type ListItemsQuery = z.infer<typeof listItemsQuerySchema>;

// ---- GET /api/signals ------------------------------------------------------

export const listSignalsQuerySchema = z.object({
  icpCategory: icpCategorySchema.optional(),
  queryCategory: z.string().optional(),
  minPainScore: z.coerce.number().min(0).max(1).optional(),
  minAiSlopScore: z.coerce.number().min(0).max(1).optional(),
  minPriorityScore: z.coerce.number().min(0).max(1).optional(),
  limit: z.coerce.number().int().positive().max(500).default(50),
});
export type ListSignalsQuery = z.infer<typeof listSignalsQuerySchema>;

// ---- GET /api/signals/trends ----------------------------------------------

export const trendsQuerySchema = z.object({
  windowDays: z.coerce.number().int().positive().max(3650).default(30),
  minSources: z.coerce.number().int().positive().default(3),
  minScore: z.coerce.number().min(0).max(1).default(0.65),
});
export type TrendsQuery = z.infer<typeof trendsQuerySchema>;

// ---- POST /api/queries/date-window ----------------------------------------

export const dateWindowQuerySchema = z.object({
  dateCategory: dateCategorySchema,
  windowDays: z.number().int().positive().max(3650),
  queries: z.array(z.string().min(1)).min(1),
  platformHints: z.array(platformHintSchema).default([]),
  maxSourcesPerQuery: z.number().int().positive().max(500).default(20),
  autoRegisterFeeds: z.boolean().default(true),
  pollingIntervalMinutes: z.number().int().positive().max(100000).optional(),
});
export type DateWindowQueryInput = z.infer<typeof dateWindowQuerySchema>;

// ---- POST /api/queries/source-category ------------------------------------

export const sourceCategoryQuerySchema = z.object({
  sourceCategory: z.string().min(1),
  queries: z.array(z.string().min(1)).min(1),
  maxSourcesPerQuery: z.number().int().positive().max(500).default(50),
  autoRegisterFeeds: z.boolean().default(false),
  pollingIntervalMinutes: z.number().int().positive().max(100000).optional(),
});
export type SourceCategoryQueryInput = z.infer<typeof sourceCategoryQuerySchema>;

// ---- POST /api/queries/pain-signal ----------------------------------------

export const painSignalQuerySchema = z.object({
  painCategory: z.string().min(1).default("ai_slop_frustration"),
  queries: z.array(z.string().min(1)).min(1),
  dateWindowDays: z.number().int().positive().max(3650).default(30),
  minPainScore: z.number().min(0).max(1).default(0.65),
  autoRegisterFeeds: z.boolean().default(true),
  platformHints: z.array(platformHintSchema).default([]),
  pollingIntervalMinutes: z.number().int().positive().max(100000).optional(),
});
export type PainSignalQueryInput = z.infer<typeof painSignalQuerySchema>;
