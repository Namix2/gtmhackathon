import type { SignalCategory } from "./signals";
import type { ScoringParams } from "./types";

export type DeriveInput = {
  contentCount: number;
  totalEngagement: number; // likes + comments + shares across content
  maxFollowers: number;
  // Number of distinct SignalEvidence rows per category.
  evidenceByCategory: Partial<Record<SignalCategory, number>>;
};

// Map an evidence-match count to a 0..10 parameter score.
function countToScore(count: number): number {
  if (count <= 0) return 0;
  if (count === 1) return 4;
  if (count === 2) return 7;
  if (count === 3) return 9;
  return 10;
}

// Map an evidence-match count to a 0 | 0.5 | 1 frustration sub-signal.
function countToFrustration(count: number): number {
  if (count <= 0) return 0;
  if (count === 1) return 0.5;
  return 1;
}

function logScore(value: number, ceilingLog: number): number {
  if (value <= 0) return 0;
  const score = (Math.log10(value + 1) / ceilingLog) * 10;
  return Math.min(10, Math.round(score * 100) / 100);
}

export function deriveParams(input: DeriveInput): ScoringParams {
  const c = (cat: SignalCategory) => input.evidenceByCategory[cat] ?? 0;

  // Network leverage blends audience size, engagement, and explicit signals.
  const followerScore = logScore(input.maxFollowers, 5); // 100k followers -> 10
  const engagementScore = logScore(input.totalEngagement, 5);
  const networkLeverage = Math.max(
    followerScore,
    engagementScore,
    countToScore(c("network_leverage"))
  );

  // Public voice blends content volume with explicit voice signals.
  const volumeScore = Math.min(10, input.contentCount * 2);
  const publicVoice = Math.max(volumeScore, countToScore(c("public_voice")));

  return {
    championFit: {
      networkLeverage,
      publicVoice,
      missionAlignment: countToScore(c("mission_alignment")),
      workflowRelevance: countToScore(c("workflow_relevance")),
      toolAdoption: countToScore(c("tool_adoption")),
    },
    persuaderUseCase: {
      outboundIntensity: countToScore(c("outbound_intensity")),
      relationshipSensitivity: countToScore(c("relationship_sensitivity")),
      commercialUrgency: countToScore(c("commercial_urgency")),
      voicePreservation: countToScore(c("voice_preservation")),
    },
    evaluatorUseCase: {
      inboundVolume: Math.max(
        countToScore(c("inbound_volume")),
        // A large audience implies meaningful inbound volume.
        followerScore >= 7 ? 6 : 0
      ),
      signalFiltering: countToScore(c("signal_filtering")),
      curationAuthority: countToScore(c("curation_authority")),
      aiNoiseExposure: countToScore(c("ai_noise_exposure")),
    },
    persuaderFrustration: {
      aiVoiceAnxiety: countToFrustration(c("ai_voice_anxiety")),
      genericOutreachFrustration: countToFrustration(
        c("generic_outreach_frustration")
      ),
      authenticityConcern: countToFrustration(c("authenticity_concern")),
      editingBurden: countToFrustration(c("editing_burden")),
      relationshipQualityConcern: countToFrustration(
        c("relationship_quality_concern")
      ),
    },
    evaluatorFrustration: {
      inboundNoiseFrustration: countToFrustration(c("inbound_noise_frustration")),
      signalDetectionAnxiety: countToFrustration(c("signal_detection_anxiety")),
      aiSlopDiscourse: countToFrustration(c("ai_slop_discourse")),
      genericPitchFrustration: countToFrustration(c("generic_pitch_frustration")),
      curationGatekeepingConcern: countToFrustration(
        c("curation_gatekeeping_concern")
      ),
    },
  };
}

// Apply manual parameter overrides (0..10 for params, 0|0.5|1 for frustration).
export function applyOverrides(
  params: ScoringParams,
  overrides: Record<string, number> | undefined
): ScoringParams {
  if (!overrides) return params;
  const next: ScoringParams = structuredClone(params);
  const groups: (keyof ScoringParams)[] = [
    "championFit",
    "persuaderUseCase",
    "evaluatorUseCase",
    "persuaderFrustration",
    "evaluatorFrustration",
  ];
  for (const [key, value] of Object.entries(overrides)) {
    for (const group of groups) {
      const groupObj = next[group] as Record<string, number>;
      if (key in groupObj) {
        groupObj[key] = value;
      }
    }
  }
  return next;
}
