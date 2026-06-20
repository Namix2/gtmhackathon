import { commercialUrgencyScore, type ItemFeatures } from "./features";
import { clamp } from "./util";

// Persuader and evaluator fit scores (05_ and 06_ specs). Item-level scoring;
// feed-level scoring is handled separately in the polling/registration policy.

export interface PersuaderComponents {
  roleFitScore: number;
  messagingPainScore: number;
  commercialUrgencyScore: number;
  reachableSourceScore: number;
  recencyScore: number;
}

export function scorePersuaderFit(features: ItemFeatures): {
  score: number;
  components: PersuaderComponents;
} {
  const components: PersuaderComponents = {
    roleFitScore:
      features.icp.category === "persuader" ? features.icp.confidence : 0,
    messagingPainScore: features.aiSlop.score,
    commercialUrgencyScore: commercialUrgencyScore(features),
    reachableSourceScore: features.reachableSource,
    recencyScore: features.recency,
  };
  const score = clamp(
    components.roleFitScore * 0.3 +
      components.messagingPainScore * 0.25 +
      components.commercialUrgencyScore * 0.2 +
      components.reachableSourceScore * 0.15 +
      components.recencyScore * 0.1
  );
  return { score, components };
}

export interface EvaluatorComponents {
  roleAuthorityScore: number;
  screeningBurdenScore: number;
  signalNoiseScore: number;
  publicVisibilityScore: number;
  recencyScore: number;
}

export function scoreEvaluatorFit(
  features: ItemFeatures,
  visibilityScore: number
): { score: number; components: EvaluatorComponents } {
  const isScreening = features.aiSlop.frustrationType === "screening_burden";
  const isInboxNoise = features.aiSlop.frustrationType === "inbox_noise";

  const components: EvaluatorComponents = {
    roleAuthorityScore:
      features.icp.category === "evaluator" ? features.icp.confidence : 0,
    screeningBurdenScore: isScreening
      ? features.aiSlop.score
      : features.aiSlop.score * 0.5,
    signalNoiseScore: isInboxNoise
      ? features.aiSlop.score
      : features.aiSlop.score * 0.5,
    publicVisibilityScore: visibilityScore,
    recencyScore: features.recency,
  };
  const score = clamp(
    components.roleAuthorityScore * 0.3 +
      components.screeningBurdenScore * 0.25 +
      components.signalNoiseScore * 0.2 +
      components.publicVisibilityScore * 0.15 +
      components.recencyScore * 0.1
  );
  return { score, components };
}
