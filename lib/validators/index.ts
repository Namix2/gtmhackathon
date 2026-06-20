import { z } from "zod";
import type { Prisma } from "@prisma/client";

export const sourceKeySchema = z.enum(["reddit", "x", "linkedin", "rss"]);
export type SourceKey = z.infer<typeof sourceKeySchema>;

export const dedupeStatusSchema = z.enum(["unresolved", "merged"]);
export type DedupeStatus = z.infer<typeof dedupeStatusSchema>;

export const individualStatusSchema = z.enum(["pending_enrichment"]);
export type IndividualStatus = z.infer<typeof individualStatusSchema>;

export const icpTargetSchema = z.enum(["persuader", "evaluator", "either"]);
export type IcpTarget = z.infer<typeof icpTargetSchema>;

export const classificationSchema = z.enum([
  "persuader",
  "evaluator",
  "hybrid",
]);
export type Classification = z.infer<typeof classificationSchema>;

export const motivationSchema = z.enum(["persuader", "evaluator"]);
export type Motivation = z.infer<typeof motivationSchema>;

export const tierSchema = z.enum(["tier1", "tier2", "tier3", "tier4"]);
export type Tier = z.infer<typeof tierSchema>;

export const netRunStatusSchema = z.enum([
  "queued",
  "running",
  "succeeded",
  "failed",
  "partial",
]);
export type NetRunStatus = z.infer<typeof netRunStatusSchema>;

export const contentTypeSchema = z.enum([
  "post",
  "tweet",
  "comment",
  "article",
  "thread",
]);
export type ContentType = z.infer<typeof contentTypeSchema>;

export const detectedBySchema = z.enum(["keyword", "llm", "manual"]);
export type DetectedBy = z.infer<typeof detectedBySchema>;

export const outreachStatusSchema = z.enum([
  "not_started",
  "queued",
  "contacted",
  "responded",
  "won",
  "archived",
]);
export type OutreachStatus = z.infer<typeof outreachStatusSchema>;

export const jsonObjectSchema = z.record(z.unknown());

export const updateSourceSchema = z.object({
  id: z.string().min(1),
  enabled: z.boolean().optional(),
  config: jsonObjectSchema.optional(),
});

export const createSourceSchema = z.object({
  key: sourceKeySchema,
  label: z.string().min(1, "Label is required"),
});

export type CreateSourceValues = z.infer<typeof createSourceSchema>;

export const keyValueParamSchema = z.object({
  key: z.string().min(1, "Key is required"),
  value: z.string(),
});

export const netFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  isActive: z.boolean(),
  icpTarget: icpTargetSchema,
  params: z.array(keyValueParamSchema),
  sourceIds: z.array(z.string()),
});

export type NetFormValues = z.infer<typeof netFormSchema>;

export const promoteCandidatesSchema = z.object({
  candidateIds: z.array(z.string()).min(1, "Select at least one candidate"),
});

export const promoteCandidateSchema = z.object({
  candidateId: z.string().min(1),
  displayName: z.string().min(1, "Display name is required"),
  primaryHandle: z.string().optional(),
});

export const deleteIndividualSchema = z.object({
  individualId: z.string().min(1),
});

export const scoreParameterOverrideSchema = z.object({
  individualId: z.string().min(1),
  classification: classificationSchema.optional(),
  parameters: z.record(z.number().min(0).max(10)).optional(),
});

export type ScoreParameterOverride = z.infer<typeof scoreParameterOverrideSchema>;

export const updateOutreachStatusSchema = z.object({
  individualId: z.string().min(1),
  outreachStatus: outreachStatusSchema,
});

export type UpdateOutreachStatus = z.infer<typeof updateOutreachStatusSchema>;

export const toggleChampionSchema = z.object({
  individualId: z.string().min(1),
  isChampion: z.boolean(),
});

export type ToggleChampion = z.infer<typeof toggleChampionSchema>;

export const individualFiltersSchema = z.object({
  tier: tierSchema.optional(),
  classification: classificationSchema.optional(),
  sourceId: z.string().optional(),
  outreachStatus: outreachStatusSchema.optional(),
});

export type IndividualFilters = z.infer<typeof individualFiltersSchema>;

export const candidateFiltersSchema = z.object({
  sourceId: z.string().optional(),
  netId: z.string().optional(),
  dedupeStatus: dedupeStatusSchema.optional(),
});

export const importRowSchema = z.object({
  handle: z.string().min(1, "handle is required"),
  externalId: z.string().optional(),
  displayName: z.string().optional(),
  profileUrl: z.string().optional(),
  title: z.string().optional(),
  body: z.string().min(1, "body is required"),
  url: z.string().optional(),
  publishedAt: z.string().optional(),
  followers: z.number().optional(),
  following: z.number().optional(),
  posts: z.number().optional(),
  likes: z.number().optional(),
  comments: z.number().optional(),
  shares: z.number().optional(),
  views: z.number().optional(),
});

export type ImportRow = z.infer<typeof importRowSchema>;

export const importContentSchema = z.object({
  sourceKey: sourceKeySchema,
  rows: z.array(importRowSchema).min(1, "Provide at least one row"),
});

export type ImportContentInput = z.infer<typeof importContentSchema>;

export function paramsArrayToObject(
  params: { key: string; value: string }[]
): Prisma.InputJsonValue {
  return Object.fromEntries(params.map(({ key, value }) => [key, value]));
}

export function paramsObjectToArray(
  params: Record<string, unknown> | null | undefined
): { key: string; value: string }[] {
  if (!params || typeof params !== "object") return [];
  return Object.entries(params).map(([key, value]) => ({
    key,
    value: value == null ? "" : String(value),
  }));
}

export function parseJsonConfig(value: string): Record<string, unknown> {
  if (!value.trim()) return {};
  const parsed: unknown = JSON.parse(value);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("Config must be a JSON object");
  }
  return parsed as Record<string, unknown>;
}
