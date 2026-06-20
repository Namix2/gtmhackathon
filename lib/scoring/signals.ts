// Signal dictionary derived from the Lightfern Priority Matrix search phrases
// and ICP Catalogue enrichment signals. Each category maps to a group used by
// the scoring engine. Phrases are matched case-insensitively against content.

export type SignalGroup =
  | "champion_fit"
  | "persuader_use_case"
  | "evaluator_use_case"
  | "persuader_frustration"
  | "evaluator_frustration";

export type SignalCategory =
  // Champion fit
  | "network_leverage"
  | "public_voice"
  | "mission_alignment"
  | "workflow_relevance"
  | "tool_adoption"
  // Persuader use-case
  | "outbound_intensity"
  | "relationship_sensitivity"
  | "commercial_urgency"
  | "voice_preservation"
  // Evaluator use-case
  | "inbound_volume"
  | "signal_filtering"
  | "curation_authority"
  | "ai_noise_exposure"
  // Persuader frustration
  | "ai_voice_anxiety"
  | "generic_outreach_frustration"
  | "authenticity_concern"
  | "editing_burden"
  | "relationship_quality_concern"
  // Evaluator frustration
  | "inbound_noise_frustration"
  | "signal_detection_anxiety"
  | "ai_slop_discourse"
  | "generic_pitch_frustration"
  | "curation_gatekeeping_concern";

export type SignalDefinition = {
  category: SignalCategory;
  group: SignalGroup;
  label: string;
  // Weight only meaningful for frustration sub-signals (matrix coefficients).
  frustrationWeight?: number;
  phrases: string[];
};

export const SIGNAL_DICTIONARY: SignalDefinition[] = [
  // --- Champion Fit ---
  {
    category: "network_leverage",
    group: "champion_fit",
    label: "Network leverage",
    phrases: [
      "newsletter",
      "substack",
      "podcast",
      "community",
      "speaking at",
      "keynote",
      "my audience",
      "followers",
      "investor",
      "vc",
      "accelerator",
      "founder community",
    ],
  },
  {
    category: "public_voice",
    group: "champion_fit",
    label: "Public voice / taste",
    phrases: [
      "i write",
      "my essay",
      "long-form",
      "writing style",
      "in my opinion",
      "i think",
      "my take",
      "hot take",
      "thread",
      "taste",
      "craft",
      "clarity",
    ],
  },
  {
    category: "mission_alignment",
    group: "champion_fit",
    label: "Mission alignment",
    phrases: [
      "ai slop",
      "fake personalisation",
      "fake personalization",
      "human connection",
      "relationship-led growth",
      "trust at scale",
      "thoughtful networking",
      "quality communication",
      "automation degrading trust",
    ],
  },
  {
    category: "workflow_relevance",
    group: "champion_fit",
    label: "Workflow relevance",
    phrases: [
      "fundraising",
      "founder-led sales",
      "investor updates",
      "hiring",
      "partnerships",
      "deal flow",
      "follow up",
      "follow-up",
      "intros",
      "introductions",
      "outreach",
      "stakeholder",
    ],
  },
  {
    category: "tool_adoption",
    group: "champion_fit",
    label: "Tool adoption propensity",
    phrases: [
      "clay",
      "apollo",
      "hubspot",
      "superhuman",
      "notion ai",
      "chatgpt",
      "claude",
      "instantly",
      "lemlist",
      "customer.io",
      "ai workflow",
      "my stack",
      "productivity tools",
    ],
  },

  // --- Persuader use-case ---
  {
    category: "outbound_intensity",
    group: "persuader_use_case",
    label: "High-stakes outbound intensity",
    phrases: [
      "founder-led sales",
      "fundraising",
      "enterprise sales",
      "senior hiring",
      "partnerships",
      "investor updates",
      "cold email",
      "outbound",
      "pipeline",
    ],
  },
  {
    category: "relationship_sensitivity",
    group: "persuader_use_case",
    label: "Relationship sensitivity",
    phrases: [
      "investors",
      "customers",
      "candidates",
      "partners",
      "advisors",
      "long-term relationship",
      "relationship-led",
      "executive search",
    ],
  },
  {
    category: "commercial_urgency",
    group: "persuader_use_case",
    label: "Commercial urgency",
    phrases: [
      "launch",
      "launching",
      "hiring push",
      "new gtm",
      "sales target",
      "new role",
      "demo day",
      "raising",
      "closing our",
    ],
  },
  {
    category: "voice_preservation",
    group: "persuader_use_case",
    label: "Need for voice preservation",
    phrases: [
      "my voice",
      "sound like me",
      "personal brand",
      "first person",
      "my tone",
      "personal perspective",
      "building in public",
    ],
  },

  // --- Evaluator use-case ---
  {
    category: "inbound_volume",
    group: "evaluator_use_case",
    label: "Inbound volume",
    phrases: [
      "my inbox",
      "open dms",
      "dms are open",
      "cold inbound",
      "vendor outreach",
      "applications",
      "too many pitches",
      "deal flow",
    ],
  },
  {
    category: "signal_filtering",
    group: "evaluator_use_case",
    label: "Signal-filtering responsibility",
    phrases: [
      "review pitches",
      "founder pitch",
      "review applications",
      "review candidates",
      "vendor pitch",
      "select cohort",
      "screening",
      "evaluate",
    ],
  },
  {
    category: "curation_authority",
    group: "evaluator_use_case",
    label: "Curation authority",
    phrases: [
      "portfolio",
      "cohort",
      "my newsletter",
      "community ownership",
      "who gets access",
      "stage time",
      "guest selection",
      "coverage",
    ],
  },
  {
    category: "ai_noise_exposure",
    group: "evaluator_use_case",
    label: "Exposure to AI-generated noise",
    phrases: [
      "cold dms",
      "pr pitches",
      "founder pitches",
      "vendor spam",
      "ai spam",
      "generic pitches",
      "publicly contactable",
    ],
  },

  // --- Persuader frustration (matrix Stage 3A weights) ---
  {
    category: "ai_voice_anxiety",
    group: "persuader_frustration",
    label: "AI voice anxiety",
    frustrationWeight: 0.08,
    phrases: [
      "doesn't sound like me",
      "does not sound like me",
      "chatgpt voice",
      "generic ai writing",
      "sounds robotic",
      "ai-generated voice",
      "ai voice",
    ],
  },
  {
    category: "generic_outreach_frustration",
    group: "persuader_frustration",
    label: "Generic outreach frustration",
    frustrationWeight: 0.07,
    phrases: [
      "bad outbound",
      "generic sales email",
      "personalisation at scale",
      "personalization at scale",
      "cold email is broken",
      "ai sales emails",
      "spray and pray",
      "everyone's outbound sounds the same",
      "everyones outbound sounds the same",
    ],
  },
  {
    category: "authenticity_concern",
    group: "persuader_frustration",
    label: "Authenticity / personal brand concern",
    frustrationWeight: 0.06,
    phrases: [
      "authenticity",
      "personal brand",
      "my voice",
      "writing style",
      "taste",
      "human connection",
    ],
  },
  {
    category: "editing_burden",
    group: "persuader_frustration",
    label: "Editing burden",
    frustrationWeight: 0.05,
    phrases: [
      "rewrite chatgpt",
      "editing ai output",
      "ai draft still needs work",
      "prompting takes too long",
      "ai writing needs editing",
    ],
  },
  {
    category: "relationship_quality_concern",
    group: "persuader_frustration",
    label: "Relationship quality concern",
    frustrationWeight: 0.04,
    phrases: [
      "relationship-led growth",
      "warm intros",
      "staying in touch",
      "relationship building",
      "trust at scale",
      "community-led growth",
    ],
  },

  // --- Evaluator frustration (matrix Stage 3B weights) ---
  {
    category: "inbound_noise_frustration",
    group: "evaluator_frustration",
    label: "Inbound noise frustration",
    frustrationWeight: 0.08,
    phrases: [
      "inbox is full",
      "too many pitches",
      "cold emails",
      "dms are full",
      "inbound overload",
      "vendor spam",
    ],
  },
  {
    category: "signal_detection_anxiety",
    group: "evaluator_frustration",
    label: "Signal detection anxiety",
    frustrationWeight: 0.07,
    phrases: [
      "signal from noise",
      "high signal",
      "hard to find signal",
      "founder quality",
      "quality bar",
      "real insight",
      "find real signal",
    ],
  },
  {
    category: "ai_slop_discourse",
    group: "evaluator_frustration",
    label: "AI-slop discourse engagement",
    frustrationWeight: 0.06,
    phrases: [
      "ai slop",
      "ai-generated noise",
      "everything sounds the same",
      "synthetic content",
      "ai spam",
      "llm-generated",
    ],
  },
  {
    category: "generic_pitch_frustration",
    group: "evaluator_frustration",
    label: "Generic pitch frustration",
    frustrationWeight: 0.05,
    phrases: [
      "bad pitch",
      "generic pitch",
      "founder pitch",
      "pr pitch",
      "vendor pitch",
      "fake personalisation",
      "fake personalization",
      "sound the same",
    ],
  },
  {
    category: "curation_gatekeeping_concern",
    group: "evaluator_frustration",
    label: "Curation / gatekeeping concern",
    frustrationWeight: 0.04,
    phrases: [
      "curation",
      "quality control",
      "community quality",
      "membership quality",
      "protect the network",
      "who gets access",
    ],
  },
];

export const SIGNAL_BY_CATEGORY: Record<SignalCategory, SignalDefinition> =
  Object.fromEntries(SIGNAL_DICTIONARY.map((d) => [d.category, d])) as Record<
    SignalCategory,
    SignalDefinition
  >;

export type PhraseMatch = {
  category: SignalCategory;
  group: SignalGroup;
  matchedPhrase: string;
  excerpt: string;
};

function buildExcerpt(text: string, index: number, length: number): string {
  const radius = 60;
  const start = Math.max(0, index - radius);
  const end = Math.min(text.length, index + length + radius);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < text.length ? "…" : "";
  return `${prefix}${text.slice(start, end).trim()}${suffix}`;
}

// Scan a block of text and return every phrase match across all categories.
export function scanText(text: string): PhraseMatch[] {
  if (!text) return [];
  const haystack = text.toLowerCase();
  const matches: PhraseMatch[] = [];

  for (const def of SIGNAL_DICTIONARY) {
    for (const phrase of def.phrases) {
      const needle = phrase.toLowerCase();
      const index = haystack.indexOf(needle);
      if (index !== -1) {
        matches.push({
          category: def.category,
          group: def.group,
          matchedPhrase: phrase,
          excerpt: buildExcerpt(text, index, needle.length),
        });
      }
    }
  }

  return matches;
}
