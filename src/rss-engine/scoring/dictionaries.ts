// Deterministic phrase dictionaries that power classification, scoring, tagging,
// and trend clustering. Centralised so behaviour is auditable and testable, and
// so the engine stays deterministic (no LLM inside the ingestion pipeline).

export type FrustrationType =
  | "inbox_noise"
  | "generic_content"
  | "trust_decay"
  | "screening_burden"
  | "unknown";

export interface AiSlopPhrase {
  phrase: string;
  weight: number;
  frustrationType: FrustrationType;
}

// Phrases from 04_query_category_pain_signals.md, expanded with common variants.
export const AI_SLOP_PHRASES: AiSlopPhrase[] = [
  { phrase: "ai slop", weight: 1.0, frustrationType: "generic_content" },
  { phrase: "generic outreach", weight: 0.8, frustrationType: "generic_content" },
  { phrase: "generic ai", weight: 0.7, frustrationType: "generic_content" },
  { phrase: "every pitch sounds the same", weight: 0.9, frustrationType: "generic_content" },
  { phrase: "sounds the same", weight: 0.5, frustrationType: "generic_content" },
  { phrase: "ai-generated pitch", weight: 0.9, frustrationType: "generic_content" },
  { phrase: "ai generated pitch", weight: 0.9, frustrationType: "generic_content" },
  { phrase: "ai-generated pitches", weight: 0.9, frustrationType: "generic_content" },
  { phrase: "ai-generated cold", weight: 0.85, frustrationType: "generic_content" },
  { phrase: "ai-generated cold outreach", weight: 0.95, frustrationType: "generic_content" },
  { phrase: "low quality outreach", weight: 0.8, frustrationType: "generic_content" },
  { phrase: "low-quality outreach", weight: 0.8, frustrationType: "generic_content" },
  { phrase: "cookie cutter", weight: 0.5, frustrationType: "generic_content" },
  { phrase: "templated", weight: 0.4, frustrationType: "generic_content" },
  { phrase: "cold email fatigue", weight: 0.85, frustrationType: "inbox_noise" },
  { phrase: "my inbox is full of ai", weight: 1.0, frustrationType: "inbox_noise" },
  { phrase: "inbox is full of ai", weight: 0.95, frustrationType: "inbox_noise" },
  { phrase: "inbox noise", weight: 0.8, frustrationType: "inbox_noise" },
  { phrase: "signal to noise", weight: 0.8, frustrationType: "inbox_noise" },
  { phrase: "signal-to-noise", weight: 0.8, frustrationType: "inbox_noise" },
  { phrase: "inbound quality is down", weight: 0.85, frustrationType: "inbox_noise" },
  { phrase: "drowning in", weight: 0.5, frustrationType: "inbox_noise" },
  { phrase: "flooded with", weight: 0.5, frustrationType: "inbox_noise" },
  { phrase: "automated spam", weight: 0.8, frustrationType: "inbox_noise" },
  { phrase: "hard to tell what is real", weight: 0.9, frustrationType: "trust_decay" },
  { phrase: "hard to tell what's real", weight: 0.9, frustrationType: "trust_decay" },
  { phrase: "can't tell what's real", weight: 0.9, frustrationType: "trust_decay" },
  { phrase: "feels fake", weight: 0.6, frustrationType: "trust_decay" },
  { phrase: "soulless", weight: 0.5, frustrationType: "trust_decay" },
  { phrase: "ai-generated applications", weight: 0.9, frustrationType: "screening_burden" },
  { phrase: "ai generated applications", weight: 0.9, frustrationType: "screening_burden" },
  { phrase: "screening burden", weight: 0.8, frustrationType: "screening_burden" },
  { phrase: "sifting through", weight: 0.6, frustrationType: "screening_burden" },
  { phrase: "too many applications", weight: 0.7, frustrationType: "screening_burden" },
];

export interface RolePhrases {
  role: string;
  phrases: string[];
  weight: number;
}

export const PERSUADER_ROLES: RolePhrases[] = [
  {
    role: "founder",
    weight: 1,
    phrases: [
      "founder",
      "co-founder",
      "founder-led sales",
      "founder led sales",
      "startup founder",
      "early-stage founder",
    ],
  },
  {
    role: "sales_leader",
    weight: 1,
    phrases: [
      "sales leader",
      "head of sales",
      "vp of sales",
      "vp sales",
      "sales team",
      "account executive",
      "sdr",
      "bdr",
      "outbound sales",
    ],
  },
  {
    role: "recruiter",
    weight: 1,
    phrases: ["recruiter", "recruiting", "talent acquisition", "sourcing candidates"],
  },
  {
    role: "growth_operator",
    weight: 1,
    phrases: ["growth marketer", "demand gen", "go-to-market", "gtm", "growth team"],
  },
  {
    role: "fundraiser",
    weight: 1,
    phrases: [
      "fundraising",
      "raising a round",
      "pitch investors",
      "cold email investor",
      "cold emailing investors",
    ],
  },
];

export const EVALUATOR_ROLES: RolePhrases[] = [
  {
    role: "investor",
    weight: 1,
    phrases: [
      "investor",
      "vc",
      "venture capital",
      "angel investor",
      "limited partner",
      "deal flow",
      "term sheet",
    ],
  },
  {
    role: "buyer",
    weight: 1,
    phrases: ["buyer", "procurement", "purchasing", "evaluating vendors", "vendor selection"],
  },
  {
    role: "hiring_manager",
    weight: 1,
    phrases: [
      "hiring manager",
      "reviewing applications",
      "screening candidates",
      "review resumes",
    ],
  },
  {
    role: "journalist",
    weight: 1,
    phrases: ["journalist", "reporter", "pr pitch", "press release", "newsroom"],
  },
  {
    role: "moderator",
    weight: 1,
    phrases: ["moderator", "community manager", "mod team", "subreddit moderator"],
  },
];

// Commercial urgency / actionability cues.
export const URGENCY_PHRASES = [
  "not working",
  "doesn't work",
  "losing",
  "need help",
  "struggling",
  "broken",
  "wasting",
  "can't keep up",
  "overwhelmed",
  "frustrated",
  "fed up",
  "tired of",
  "sick of",
  "hate",
];

export const NEGATIVE_SENTIMENT_WORDS = [
  "frustrated",
  "annoyed",
  "tired",
  "sick",
  "hate",
  "useless",
  "garbage",
  "spam",
  "noise",
  "broken",
  "fails",
  "failing",
  "worse",
  "bad",
  "terrible",
  "awful",
  "fed up",
];

export interface TagEntry {
  tag: string;
  phrases: string[];
}

export const TAG_DICTIONARY: TagEntry[] = [
  { tag: "ai-slop", phrases: ["ai slop", "ai-generated", "ai generated", "generic outreach"] },
  { tag: "cold-outreach", phrases: ["cold outreach", "cold email", "outbound"] },
  { tag: "founder-led-sales", phrases: ["founder-led sales", "founder led sales"] },
  { tag: "fundraising", phrases: ["fundraising", "investor", "pitch deck", "raising a round"] },
  { tag: "recruiting", phrases: ["recruiter", "applications", "hiring", "candidates"] },
  { tag: "inbox-noise", phrases: ["inbox", "signal to noise", "spam", "deliverability"] },
  { tag: "gtm", phrases: ["gtm", "go-to-market", "growth", "demand gen"] },
  { tag: "trust", phrases: ["trust", "authentic", "what is real", "what's real"] },
];

export function countMatches(haystackLower: string, phrases: string[]): string[] {
  const matched: string[] = [];
  for (const phrase of phrases) {
    if (haystackLower.includes(phrase)) matched.push(phrase);
  }
  return matched;
}
