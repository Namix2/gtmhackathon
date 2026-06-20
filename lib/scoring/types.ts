import type { Classification, Motivation, Tier } from "@/lib/validators";

// Each parameter is scored 0..10 (per the Priority Matrix).
export type ChampionFitParams = {
  networkLeverage: number;
  publicVoice: number;
  missionAlignment: number;
  workflowRelevance: number;
  toolAdoption: number;
};

export type PersuaderUseCaseParams = {
  outboundIntensity: number;
  relationshipSensitivity: number;
  commercialUrgency: number;
  voicePreservation: number;
};

export type EvaluatorUseCaseParams = {
  inboundVolume: number;
  signalFiltering: number;
  curationAuthority: number;
  aiNoiseExposure: number;
};

// Each frustration sub-signal is scored 0 | 0.5 | 1 (per the matrix).
export type PersuaderFrustrationParams = {
  aiVoiceAnxiety: number;
  genericOutreachFrustration: number;
  authenticityConcern: number;
  editingBurden: number;
  relationshipQualityConcern: number;
};

export type EvaluatorFrustrationParams = {
  inboundNoiseFrustration: number;
  signalDetectionAnxiety: number;
  aiSlopDiscourse: number;
  genericPitchFrustration: number;
  curationGatekeepingConcern: number;
};

export type ScoringParams = {
  championFit: ChampionFitParams;
  persuaderUseCase: PersuaderUseCaseParams;
  evaluatorUseCase: EvaluatorUseCaseParams;
  persuaderFrustration: PersuaderFrustrationParams;
  evaluatorFrustration: EvaluatorFrustrationParams;
};

export type TrackResult = {
  useCaseScore: number;
  baseScore: number;
  frustrationCoefficient: number;
  adjustedScore: number;
};

export type ScoreResult = {
  classification: Classification;
  dominantMotivation: Motivation;
  championFitScore: number;
  useCaseScore: number;
  baseScore: number;
  frustrationCoefficient: number;
  adjustedScore: number;
  tier: Tier;
  outreachAngle: string;
  persuaderTrack: TrackResult;
  evaluatorTrack: TrackResult;
  params: ScoringParams;
};
