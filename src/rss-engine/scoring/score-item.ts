import type { FeedItem, FeedSource, ScoredSignal } from "../types";
import { buildFeatures } from "./features";
import { scorePainSignal } from "./pain-signal-scorer";
import { scoreChampion } from "./champion-scorer";
import { scorePersuaderFit, scoreEvaluatorFit } from "./icp-scorers";
import { priorityScore } from "./priority-matrix";
import { round } from "./util";

// Orchestrates the full scoring pipeline for one canonical item, producing a
// ScoredSignal with a human-readable rationale. Pure and deterministic given a
// fixed `now`.

export interface ScoreItemOptions {
  source?: FeedSource;
  now?: Date;
  windowDays?: number;
  queryCategory?: string;
}

export function scoreItem(
  item: FeedItem,
  options: ScoreItemOptions = {}
): ScoredSignal {
  const now = options.now ?? new Date();
  const windowDays = options.windowDays ?? 30;
  const features = buildFeatures(item, options.source, now, windowDays);

  const pain = scorePainSignal(features);
  const champion = scoreChampion(features, pain.score);
  const persuader = scorePersuaderFit(features);
  const evaluator = scoreEvaluatorFit(features, champion.visibilityScore);

  const icpFitScore = Math.max(persuader.score, evaluator.score);
  const priority = priorityScore({
    painSignalScore: pain.score,
    icpFitScore,
    championScore: champion.championScore,
    freshnessMultiplier: features.freshness,
  });

  const rationale = buildRationale(features, pain.score, priority);

  return {
    itemId: item.id,
    icpCategory: features.icp.category,
    icpRole: features.icp.role,
    queryCategory: options.queryCategory,
    painSignalScore: round(pain.score),
    aiSlopFrustrationScore: round(features.aiSlop.score),
    authorityScore: round(champion.authorityScore),
    visibilityScore: round(champion.visibilityScore),
    championScore: round(champion.championScore),
    priorityScore: round(priority),
    rationale,
    scoredAt: now.toISOString(),
  };
}

function buildRationale(
  features: ReturnType<typeof buildFeatures>,
  painScore: number,
  priority: number
): string[] {
  const rationale: string[] = [];

  if (features.aiSlop.matchedPhrases.length > 0) {
    rationale.push(
      `AI-slop frustration (${features.aiSlop.frustrationType}): ${features.aiSlop.matchedPhrases
        .slice(0, 5)
        .join(", ")}`
    );
  } else {
    rationale.push("No explicit AI-slop frustration phrases detected");
  }

  if (features.icp.category !== "unknown") {
    rationale.push(
      `ICP ${features.icp.category}/${features.icp.role} (confidence ${round(
        features.icp.confidence,
        2
      )})${
        features.icp.evidence.length
          ? `: ${features.icp.evidence.slice(0, 4).join(", ")}`
          : ""
      }`
    );
  } else {
    rationale.push("ICP role unclear");
  }

  if (features.urgencyMatches.length > 0) {
    rationale.push(`Urgency cues: ${features.urgencyMatches.slice(0, 4).join(", ")}`);
  }

  if (Number.isFinite(features.ageHours)) {
    rationale.push(
      `Freshness x${features.freshness} (age ${Math.round(features.ageHours)}h)`
    );
  }

  rationale.push(`Pain signal ${round(painScore, 2)}, priority ${round(priority, 2)}`);
  return rationale;
}
