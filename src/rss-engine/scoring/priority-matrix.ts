import { clamp } from "./util";

// Priority matrix — collapses the individual signal scores into a single 0..1
// priority used for ranking and trend aggregation. The freshness multiplier
// (from the recent spec) boosts time-sensitive items; the result is clamped.

export interface PriorityInputs {
  painSignalScore: number;
  icpFitScore: number; // max(persuaderFit, evaluatorFit)
  championScore: number;
  freshnessMultiplier: number;
}

export function priorityScore(inputs: PriorityInputs): number {
  const base =
    inputs.painSignalScore * 0.4 +
    inputs.icpFitScore * 0.35 +
    inputs.championScore * 0.25;
  return clamp(base * inputs.freshnessMultiplier);
}
