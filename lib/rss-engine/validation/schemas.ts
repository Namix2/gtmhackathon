import { z } from "zod";

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
  "youtube",
  "podcast",
  "unknown",
]);

export const dateCategorySchema = z.enum(["recent", "trending", "evergreen"]);

export const queryCategorySchema = z.enum([
  "pain_signals",
  "icp_persuaders",
  "icp_evaluators",
  "source_discovery",
]);

export const discoveryProviderSchema = z.enum(["exa", "tavily"]);

export const feedResolutionStrategySchema = z.enum([
  "native_then_rsshub_then_rssbridge",
  "native_then_rsshub_then_rssbridge_then_rss_app",
]);

export const discoverySearchRequestSchema = z.object({
  queryCategory: queryCategorySchema,
  queries: z.array(z.string().min(1)).min(1),
  providers: z.array(discoveryProviderSchema).default(["exa", "tavily"]),
  platformHints: z.array(originalPlatformSchema).default([]),
  dateWindowDays: z.number().int().positive().default(30),
  maxResultsPerProvider: z.number().int().positive().default(25),
});

export const feedCandidateSchema = z.object({
  sourceType: sourceTypeSchema,
  feedUrl: z.string().url(),
  confidence: z.number().min(0).max(1),
});

export const discoverySearchResponseSchema = z.object({
  results: z.array(
    z.object({
      provider: discoveryProviderSchema,
      url: z.string().url(),
      title: z.string().optional(),
      summary: z.string().optional(),
      publishedAt: z.string().optional(),
      platformHint: originalPlatformSchema,
      feedCandidates: z.array(feedCandidateSchema),
    })
  ),
});

export const resolveFeedRequestSchema = z.object({
  url: z.string().url(),
  platformHint: originalPlatformSchema.optional(),
  strategy: feedResolutionStrategySchema.default(
    "native_then_rsshub_then_rssbridge_then_rss_app"
  ),
});

export const resolveFeedResponseSchema = z.object({
  resolved: z.boolean(),
  selected: feedCandidateSchema.optional(),
  candidates: z.array(feedCandidateSchema),
  rejections: z.array(
    z.object({
      sourceType: sourceTypeSchema.optional(),
      reason: z.string(),
      detail: z.string().optional(),
    })
  ),
});

export const registerFeedRequestSchema = z.object({
  sourceType: sourceTypeSchema,
  originalPlatform: originalPlatformSchema,
  feedUrl: z.string().url(),
  homepageUrl: z.string().url().optional(),
  title: z.string().optional(),
  queryCategory: queryCategorySchema.optional(),
  dateCategory: dateCategorySchema.optional(),
  pollingIntervalMinutes: z.number().int().positive().optional(),
  queryRunId: z.string().optional(),
});

export const registerFeedResponseSchema = z.object({
  id: z.string(),
  active: z.boolean(),
  created: z.boolean(),
});

export const pollFeedResponseSchema = z.object({
  feedSourceId: z.string(),
  fetchedItems: z.number(),
  newItems: z.number(),
  duplicates: z.number(),
  errors: z.array(z.string()),
});

export const dateWindowQuerySchema = z.object({
  dateCategory: dateCategorySchema,
  windowDays: z.number().int().positive(),
  queries: z.array(z.string().min(1)).min(1),
  platformHints: z.array(originalPlatformSchema).default([]),
  maxSourcesPerQuery: z.number().int().positive().default(20),
  autoRegisterFeeds: z.boolean().default(true),
  pollingIntervalMinutes: z.number().int().positive().optional(),
});

export const dateWindowQueryResponseSchema = z.object({
  dateCategory: dateCategorySchema,
  registeredFeeds: z.number(),
  candidateFeeds: z.number(),
  rejectedCandidates: z.array(
    z.object({ url: z.string(), reason: z.string() })
  ),
  nextPollAt: z.string().optional(),
  queryRunId: z.string(),
});

export const sourceCategoryQuerySchema = z.object({
  sourceCategory: originalPlatformSchema,
  queries: z.array(z.string().min(1)).min(1),
  maxSourcesPerQuery: z.number().int().positive().default(50),
  autoRegisterFeeds: z.boolean().default(false),
  pollingIntervalMinutes: z.number().int().positive().optional(),
});

export const painSignalQuerySchema = z.object({
  painCategory: z.string().default("ai_slop_frustration"),
  queries: z.array(z.string().min(1)).min(1),
  dateWindowDays: z.number().int().positive().default(30),
  minPainScore: z.number().min(0).max(1).default(0.65),
  autoRegisterFeeds: z.boolean().default(true),
  pollingIntervalMinutes: z.number().int().positive().optional(),
});

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.unknown()).optional(),
  }),
});

export type DiscoverySearchRequest = z.infer<typeof discoverySearchRequestSchema>;
export type ResolveFeedRequest = z.infer<typeof resolveFeedRequestSchema>;
export type RegisterFeedRequest = z.infer<typeof registerFeedRequestSchema>;
export type DateWindowQueryRequest = z.infer<typeof dateWindowQuerySchema>;
export type SourceCategoryQueryRequest = z.infer<
  typeof sourceCategoryQuerySchema
>;
export type PainSignalQueryRequest = z.infer<typeof painSignalQuerySchema>;
