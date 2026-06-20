import {
  EVALUATOR_ROLES,
  PERSUADER_ROLES,
  type RolePhrases,
} from "./dictionaries";
import { clamp } from "./util";

// ICP classifier — determines whether content reflects a persuader (needs others
// to act) or an evaluator (assesses/filters messages), plus the specific role.
// Used by 05_query_category_icp_persuaders.md and 06_query_category_icp_evaluators.md.

export type IcpCategory = "persuader" | "evaluator" | "unknown";

export interface IcpClassificationResult {
  category: IcpCategory;
  role: string;
  confidence: number;
  evidence: string[];
}

interface SideResult {
  weight: number;
  role: string;
  evidence: string[];
}

function scoreSide(haystack: string, roles: RolePhrases[]): SideResult {
  let totalWeight = 0;
  let topRole = "unknown";
  let topRoleWeight = 0;
  const evidence: string[] = [];

  for (const role of roles) {
    let roleWeight = 0;
    for (const phrase of role.phrases) {
      if (haystack.includes(phrase)) {
        roleWeight += role.weight;
        evidence.push(phrase);
      }
    }
    totalWeight += roleWeight;
    if (roleWeight > topRoleWeight) {
      topRoleWeight = roleWeight;
      topRole = role.role;
    }
  }
  return { weight: totalWeight, role: topRole, evidence };
}

export function classifyIcp(text: string): IcpClassificationResult {
  const haystack = text.toLowerCase();
  const persuader = scoreSide(haystack, PERSUADER_ROLES);
  const evaluator = scoreSide(haystack, EVALUATOR_ROLES);

  if (persuader.weight === 0 && evaluator.weight === 0) {
    return { category: "unknown", role: "unknown", confidence: 0, evidence: [] };
  }

  const winner = persuader.weight >= evaluator.weight ? persuader : evaluator;
  const category: IcpCategory =
    persuader.weight >= evaluator.weight ? "persuader" : "evaluator";
  const loser = winner === persuader ? evaluator : persuader;

  // Confidence rises with the winning side's strength and its separation from
  // the other side.
  const separation = winner.weight - loser.weight;
  const confidence = clamp(
    0.4 * clamp(winner.weight / 3) + 0.6 * clamp(separation / 3)
  );

  return {
    category,
    role: winner.role,
    confidence,
    evidence: winner.evidence,
  };
}
