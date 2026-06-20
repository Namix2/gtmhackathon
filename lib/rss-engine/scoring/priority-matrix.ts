import { classifyAiSlopFrustration, painSignalScore } from "./ai-slop-frustration";
import { freshnessMultiplier, itemAgeHours } from "./freshness";
import {
  classifyIcp,
  evaluatorFitScore,
  persuaderFitScore,
} from "./icp-classifier";
import type { QueryCategory } from "../types";

export type ItemScoreInput = {
  title: string;
  contentText?: string;
  summary?: string;
  author?: string;
  platform?: string;
  publishedAt?: Date | null;
  queryCategory?: QueryCategory;
};

export type ItemScoreOutput = {
  icpCategory: "persuader" | "evaluator" | "unknown";
  icpRole?: string;
  painSignalScore: number;
  aiSlopFrustrationScore: number;
  authorityScore: number;
  visibilityScore: number;
  championScore: number;
  priorityScore: number;
  rationale: string[];
};

export function scoreFeedItem(input: ItemScoreInput): ItemScoreOutput {
  const text = [input.title, input.summary, input.contentText, input.author]
    .filter(Boolean)
    .join("\n");

  const icp = classifyIcp(text, input.queryCategory);
  const aiSlop = classifyAiSlopFrustration(text);
  const pain = painSignalScore({
    text,
    publishedAt: input.publishedAt,
    platform: input.platform,
  });

  const persuaderFit =
    icp.category === "persuader" ? persuaderFitScore(text) : 0;
  const evaluatorFit =
    icp.category === "evaluator" ? evaluatorFitScore(text) : 0;

  const authorityScore =
    icp.category === "evaluator"
      ? Math.max(evaluatorFit, 0.3)
      : Math.max(persuaderFit * 0.6, 0.2);

  const visibilityScore =
    input.platform === "substack" ||
    input.platform === "reddit" ||
    input.platform === "hackernews"
      ? 0.75
      : 0.5;

  const championScore = Math.min(
    1,
    authorityScore * 0.4 + aiSlop.score * 0.35 + pain.score * 0.25
  );

  const freshness = freshnessMultiplier(itemAgeHours(input.publishedAt));
  const priorityScore = Math.min(1, championScore * freshness);

  return {
    icpCategory: icp.category,
    icpRole: icp.role,
    painSignalScore: pain.score,
    aiSlopFrustrationScore: aiSlop.score,
    authorityScore,
    visibilityScore,
    championScore,
    priorityScore,
    rationale: [
      ...pain.rationale,
      `icp=${icp.category}/${icp.role}`,
      `aiSlop=${aiSlop.score.toFixed(2)}`,
      `champion=${championScore.toFixed(2)}`,
      `freshnessMultiplier=${freshness.toFixed(2)}`,
    ],
  };
}

export function sourceQualityScore(input: {
  postsInWindow: number;
  topicalMatches: number;
  authorityScore: number;
  feedReliability: number;
}): { score: number; rationale: string[] } {
  const publishingConsistencyScore = Math.min(1, input.postsInWindow / 4);
  const topicalRelevanceScore = Math.min(1, input.topicalMatches / 3);
  const score =
    publishingConsistencyScore * 0.25 +
    topicalRelevanceScore * 0.3 +
    input.authorityScore * 0.25 +
    input.feedReliability * 0.2;

  return {
    score: Math.min(1, score),
    rationale: [
      `publishingConsistency=${publishingConsistencyScore.toFixed(2)}`,
      `topicalRelevance=${topicalRelevanceScore.toFixed(2)}`,
      `authority=${input.authorityScore.toFixed(2)}`,
      `feedReliability=${input.feedReliability.toFixed(2)}`,
    ],
  };
}
