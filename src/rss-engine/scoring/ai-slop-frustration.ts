import {
  AI_SLOP_PHRASES,
  NEGATIVE_SENTIMENT_WORDS,
  type FrustrationType,
} from "./dictionaries";
import { saturate } from "./util";

// AI-slop frustration classifier (04_query_category_pain_signals.md).
export interface AiSlopFrustrationResult {
  score: number; // 0..1
  matchedPhrases: string[];
  sentiment: "negative" | "neutral" | "positive";
  frustrationType: FrustrationType;
}

export function classifyAiSlopFrustration(text: string): AiSlopFrustrationResult {
  const haystack = text.toLowerCase();
  const matched: { phrase: string; weight: number; type: FrustrationType }[] = [];
  for (const entry of AI_SLOP_PHRASES) {
    if (haystack.includes(entry.phrase)) {
      matched.push({
        phrase: entry.phrase,
        weight: entry.weight,
        type: entry.frustrationType,
      });
    }
  }

  if (matched.length === 0) {
    const hasNegative = NEGATIVE_SENTIMENT_WORDS.some((w) => haystack.includes(w));
    return {
      score: 0,
      matchedPhrases: [],
      sentiment: hasNegative ? "negative" : "neutral",
      frustrationType: "unknown",
    };
  }

  const weightSum = matched.reduce((sum, m) => sum + m.weight, 0);
  const score = saturate(weightSum);

  // Dominant frustration type = the type carrying the most matched weight.
  const weightByType = new Map<FrustrationType, number>();
  for (const m of matched) {
    weightByType.set(m.type, (weightByType.get(m.type) ?? 0) + m.weight);
  }
  let frustrationType: FrustrationType = "unknown";
  let best = -1;
  for (const [type, w] of weightByType) {
    if (w > best) {
      best = w;
      frustrationType = type;
    }
  }

  return {
    score,
    matchedPhrases: matched.map((m) => m.phrase),
    sentiment: "negative",
    frustrationType,
  };
}
