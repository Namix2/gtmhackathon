import {
  actionabilityScore,
  problemSpecificityScore,
  type ItemFeatures,
} from "./features";
import { clamp } from "./util";

// painSignalScore formula from 04_query_category_pain_signals.md.
export interface PainSignalComponents {
  explicitFrustrationScore: number;
  problemSpecificityScore: number;
  recencyScore: number;
  audienceFitScore: number;
  actionabilityScore: number;
}

export interface PainSignalResult {
  score: number;
  components: PainSignalComponents;
}

export function scorePainSignal(features: ItemFeatures): PainSignalResult {
  const components: PainSignalComponents = {
    explicitFrustrationScore: features.aiSlop.score,
    problemSpecificityScore: problemSpecificityScore(features),
    recencyScore: features.recency,
    audienceFitScore: features.icp.confidence,
    actionabilityScore: actionabilityScore(features),
  };

  const score = clamp(
    components.explicitFrustrationScore * 0.35 +
      components.problemSpecificityScore * 0.25 +
      components.recencyScore * 0.15 +
      components.audienceFitScore * 0.15 +
      components.actionabilityScore * 0.1
  );

  return { score, components };
}
