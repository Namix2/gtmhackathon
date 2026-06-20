import { scanText } from "@/lib/scoring/signals";
import type { AiSlopFrustrationResult } from "../types";
import { recencyScore } from "./freshness";

const FRUSTRATION_PHRASES: Record<
  AiSlopFrustrationResult["frustrationType"],
  string[]
> = {
  inbox_noise: [
    "inbox is full",
    "too many pitches",
    "inbox noise",
    "dms are full",
    "cold emails",
  ],
  generic_content: [
    "generic outreach",
    "generic pitch",
    "everything sounds the same",
    "ai slop",
    "low quality outreach",
  ],
  trust_decay: [
    "hard to tell what is real",
    "trust",
    "authentic",
    "fake personalisation",
    "fake personalization",
  ],
  screening_burden: [
    "signal to noise",
    "screening",
    "overwhelmed",
    "filter applications",
    "quality bar",
  ],
  unknown: [],
};

function detectFrustrationType(
  text: string
): AiSlopFrustrationResult["frustrationType"] {
  const lower = text.toLowerCase();
  let best: AiSlopFrustrationResult["frustrationType"] = "unknown";
  let bestCount = 0;

  for (const [type, phrases] of Object.entries(FRUSTRATION_PHRASES) as [
    AiSlopFrustrationResult["frustrationType"],
    string[],
  ][]) {
    const count = phrases.filter((p) => lower.includes(p)).length;
    if (count > bestCount) {
      bestCount = count;
      best = type;
    }
  }
  return best;
}

function sentimentFromText(text: string): AiSlopFrustrationResult["sentiment"] {
  const lower = text.toLowerCase();
  const negative = [
    "frustrated",
    "annoyed",
    "hate",
    "tired",
    "overwhelmed",
    "spam",
    "noise",
    "slop",
    "generic",
    "bad",
  ].some((w) => lower.includes(w));
  if (negative) return "negative";
  const positive = ["love", "great", "helpful", "works well"].some((w) =>
    lower.includes(w)
  );
  if (positive) return "positive";
  return "neutral";
}

export function classifyAiSlopFrustration(
  text: string
): AiSlopFrustrationResult {
  const matches = scanText(text);
  const frustrationMatches = matches.filter(
    (m) =>
      m.group === "persuader_frustration" || m.group === "evaluator_frustration"
  );
  const matchedPhrases = [
    ...new Set(frustrationMatches.map((m) => m.matchedPhrase)),
  ];

  const explicit = Math.min(1, matchedPhrases.length * 0.2);
  const sentiment = sentimentFromText(text);
  const sentimentBoost = sentiment === "negative" ? 0.15 : 0;

  return {
    score: Math.min(1, explicit + sentimentBoost),
    matchedPhrases,
    sentiment,
    frustrationType: detectFrustrationType(text),
  };
}

export function painSignalScore(input: {
  text: string;
  publishedAt?: Date | null;
  platform?: string;
}): { score: number; rationale: string[] } {
  const aiSlop = classifyAiSlopFrustration(input.text);
  const matches = scanText(input.text);
  const explicitFrustrationScore = Math.min(1, matches.length * 0.12);
  const problemSpecificityScore = Math.min(
    1,
    aiSlop.matchedPhrases.length * 0.18
  );
  const recency = recencyScore(input.publishedAt);
  const audienceFitScore =
    input.platform === "substack" || input.platform === "reddit" ? 0.7 : 0.5;
  const actionabilityScore = aiSlop.sentiment === "negative" ? 0.8 : 0.4;

  const score =
    explicitFrustrationScore * 0.35 +
    problemSpecificityScore * 0.25 +
    recency * 0.15 +
    audienceFitScore * 0.15 +
    actionabilityScore * 0.1;

  return {
    score: Math.min(1, score),
    rationale: [
      `explicitFrustration=${explicitFrustrationScore.toFixed(2)}`,
      `problemSpecificity=${problemSpecificityScore.toFixed(2)}`,
      `recency=${recency.toFixed(2)}`,
      `matchedPhrases=${aiSlop.matchedPhrases.join(", ") || "none"}`,
      `frustrationType=${aiSlop.frustrationType}`,
    ],
  };
}
