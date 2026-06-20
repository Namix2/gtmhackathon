import type { Classification, Motivation, Tier } from "@/lib/validators";
import type {
  ChampionFitParams,
  EvaluatorFrustrationParams,
  EvaluatorUseCaseParams,
  PersuaderFrustrationParams,
  PersuaderUseCaseParams,
  ScoreResult,
  ScoringParams,
  TrackResult,
} from "./types";

const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n));
const round2 = (n: number) => Math.round(n * 100) / 100;

// Stage 1: Champion Fit Score (0..10).
export function championFitScore(p: ChampionFitParams): number {
  return round2(
    0.3 * p.networkLeverage +
      0.25 * p.publicVoice +
      0.2 * p.missionAlignment +
      0.15 * p.workflowRelevance +
      0.1 * p.toolAdoption
  );
}

// Stage 2A: Persuader Use-Case Score (0..10).
export function persuaderUseCaseScore(p: PersuaderUseCaseParams): number {
  return round2(
    0.35 * p.outboundIntensity +
      0.25 * p.relationshipSensitivity +
      0.2 * p.commercialUrgency +
      0.2 * p.voicePreservation
  );
}

// Stage 2B: Evaluator Use-Case Score (0..10).
export function evaluatorUseCaseScore(p: EvaluatorUseCaseParams): number {
  return round2(
    0.35 * p.inboundVolume +
      0.25 * p.signalFiltering +
      0.2 * p.curationAuthority +
      0.2 * p.aiNoiseExposure
  );
}

// Stage 3A: Persuader AI-Slop-Frustration Coefficient (1.00..1.30).
export function persuaderFrustrationCoefficient(
  p: PersuaderFrustrationParams
): number {
  const weighted =
    0.08 * p.aiVoiceAnxiety +
    0.07 * p.genericOutreachFrustration +
    0.06 * p.authenticityConcern +
    0.05 * p.editingBurden +
    0.04 * p.relationshipQualityConcern;
  return round2(1 + Math.min(0.3, weighted));
}

// Stage 3B: Evaluator AI-Slop-Frustration Coefficient (1.00..1.30).
export function evaluatorFrustrationCoefficient(
  p: EvaluatorFrustrationParams
): number {
  const weighted =
    0.08 * p.inboundNoiseFrustration +
    0.07 * p.signalDetectionAnxiety +
    0.06 * p.aiSlopDiscourse +
    0.05 * p.genericPitchFrustration +
    0.04 * p.curationGatekeepingConcern;
  return round2(1 + Math.min(0.3, weighted));
}

export function baseScore(champion: number, useCase: number): number {
  return round2(0.55 * champion + 0.45 * useCase);
}

export function tierForScore(adjusted: number): Tier {
  if (adjusted >= 10.0) return "tier1";
  if (adjusted >= 8.5) return "tier2";
  if (adjusted >= 7.0) return "tier3";
  return "tier4";
}

function buildTrack(
  championFit: number,
  useCase: number,
  coefficient: number
): TrackResult {
  const base = baseScore(championFit, useCase);
  return {
    useCaseScore: useCase,
    baseScore: base,
    frustrationCoefficient: coefficient,
    adjustedScore: round2(base * coefficient),
  };
}

function buildOutreachAngle(
  motivation: Motivation,
  params: ScoringParams
): string {
  if (motivation === "persuader") {
    const drivers: string[] = [];
    if (params.persuaderFrustration.aiVoiceAnxiety >= 0.5)
      drivers.push("their AI-voice concern");
    if (params.persuaderFrustration.genericOutreachFrustration >= 0.5)
      drivers.push("frustration with generic outbound");
    if (params.persuaderUseCase.voicePreservation >= 5)
      drivers.push("a recognisable personal voice");
    const because = drivers.length
      ? ` Lead with ${drivers.slice(0, 2).join(" and ")}.`
      : "";
    return `Sound like yourself at scale.${because}`;
  }

  const drivers: string[] = [];
  if (params.evaluatorFrustration.aiSlopDiscourse >= 0.5)
    drivers.push("their public AI-slop stance");
  if (params.evaluatorFrustration.inboundNoiseFrustration >= 0.5)
    drivers.push("inbound overload");
  if (params.evaluatorUseCase.curationAuthority >= 5)
    drivers.push("their gatekeeping role");
  const because = drivers.length
    ? ` Lead with ${drivers.slice(0, 2).join(" and ")}.`
    : "";
  return `AI slop has made real signal harder to find.${because}`;
}

const HYBRID_USE_CASE_THRESHOLD = 4;

export function scoreFromParams(params: ScoringParams): ScoreResult {
  const championFit = championFitScore(params.championFit);
  const persuaderUseCase = persuaderUseCaseScore(params.persuaderUseCase);
  const evaluatorUseCase = evaluatorUseCaseScore(params.evaluatorUseCase);

  const persuaderTrack = buildTrack(
    championFit,
    persuaderUseCase,
    persuaderFrustrationCoefficient(params.persuaderFrustration)
  );
  const evaluatorTrack = buildTrack(
    championFit,
    evaluatorUseCase,
    evaluatorFrustrationCoefficient(params.evaluatorFrustration)
  );

  const persuaderDominant =
    persuaderTrack.adjustedScore >= evaluatorTrack.adjustedScore;
  const dominantMotivation: Motivation = persuaderDominant
    ? "persuader"
    : "evaluator";
  const dominantTrack = persuaderDominant ? persuaderTrack : evaluatorTrack;

  // Hybrid when both use-cases are meaningfully present.
  const bothFit =
    persuaderUseCase >= HYBRID_USE_CASE_THRESHOLD &&
    evaluatorUseCase >= HYBRID_USE_CASE_THRESHOLD;
  const classification: Classification = bothFit
    ? "hybrid"
    : dominantMotivation;

  const adjustedScore = clamp(dominantTrack.adjustedScore, 0, 13);

  return {
    classification,
    dominantMotivation,
    championFitScore: championFit,
    useCaseScore: dominantTrack.useCaseScore,
    baseScore: dominantTrack.baseScore,
    frustrationCoefficient: dominantTrack.frustrationCoefficient,
    adjustedScore,
    tier: tierForScore(adjustedScore),
    outreachAngle: buildOutreachAngle(dominantMotivation, params),
    persuaderTrack,
    evaluatorTrack,
    params,
  };
}
