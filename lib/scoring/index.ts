export * from "./signals";
export * from "./types";
export * from "./score";
export * from "./derive";

import { applyOverrides, deriveParams, type DeriveInput } from "./derive";
import { scoreFromParams } from "./score";
import type { ScoreResult } from "./types";

// Top-level convenience: derive parameters from raw aggregates (optionally
// applying manual overrides) and produce a full score result.
export function scoreProspect(
  input: DeriveInput,
  overrides?: Record<string, number>
): ScoreResult {
  const derived = deriveParams(input);
  const params = applyOverrides(derived, overrides);
  return scoreFromParams(params);
}
