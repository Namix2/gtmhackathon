export function tierLabel(tier: string | null | undefined): string {
  switch (tier) {
    case "tier1":
      return "Tier 1 · Priority";
    case "tier2":
      return "Tier 2 · High";
    case "tier3":
      return "Tier 3 · Standard";
    case "tier4":
      return "Tier 4 · Watch";
    default:
      return "Unscored";
  }
}

export function tierShortLabel(tier: string | null | undefined): string {
  switch (tier) {
    case "tier1":
      return "T1";
    case "tier2":
      return "T2";
    case "tier3":
      return "T3";
    case "tier4":
      return "T4";
    default:
      return "—";
  }
}

export function tierBadgeVariant(
  tier: string | null | undefined
): "default" | "secondary" | "outline" | "destructive" {
  switch (tier) {
    case "tier1":
      return "default";
    case "tier2":
      return "secondary";
    case "tier3":
      return "outline";
    default:
      return "outline";
  }
}

export function classificationLabel(value: string | null | undefined): string {
  switch (value) {
    case "persuader":
      return "High-Stakes Persuader";
    case "evaluator":
      return "High-Signal Evaluator";
    case "hybrid":
      return "Hybrid";
    default:
      return "Unclassified";
  }
}

export function motivationLabel(value: string | null | undefined): string {
  switch (value) {
    case "persuader":
      return "Persuader";
    case "evaluator":
      return "Evaluator";
    default:
      return "—";
  }
}

export function outreachStatusLabel(value: string | null | undefined): string {
  switch (value) {
    case "not_started":
      return "Not started";
    case "queued":
      return "Queued";
    case "contacted":
      return "Contacted";
    case "responded":
      return "Responded";
    case "won":
      return "Won";
    case "archived":
      return "Archived";
    default:
      return "Not started";
  }
}

export const OUTREACH_STATUSES = [
  "not_started",
  "queued",
  "contacted",
  "responded",
  "won",
  "archived",
] as const;

export function tierPlaybook(tier: string | null | undefined): {
  channel: string;
  approach: string;
} {
  switch (tier) {
    case "tier1":
      return {
        channel: "Founder-to-founder, hand-written DM or warm intro",
        approach:
          "Reference their specific content. Personal, high-effort, no template. Aim for a call.",
      };
    case "tier2":
      return {
        channel: "Personalised DM referencing a recent post",
        approach:
          "Lead with the detected angle. Light personalisation, single clear ask.",
      };
    case "tier3":
      return {
        channel: "Semi-personalised outreach or nurture",
        approach:
          "Add to a low-frequency nurture sequence; revisit if engagement grows.",
      };
    default:
      return {
        channel: "Monitor only",
        approach: "Keep watching for stronger signals before reaching out.",
      };
  }
}
