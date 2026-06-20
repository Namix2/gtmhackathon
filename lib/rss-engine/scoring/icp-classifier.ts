import type {
  EvaluatorRole,
  IcpCategory,
  IcpClassification,
  PersuaderRole,
  QueryCategory,
} from "../types";

const PERSUADER_EVIDENCE: Record<PersuaderRole, string[]> = {
  founder: ["founder", "startup", "founder-led", "bootstrapped"],
  sales_leader: ["sales leader", "head of sales", "vp sales", "sdr"],
  recruiter: ["recruiter", "hiring", "applications", "talent"],
  growth_operator: ["growth", "outbound", "pipeline", "gtm"],
  fundraiser: ["fundraising", "investor email", "raise", "pitch deck"],
  unknown: [],
};

const EVALUATOR_EVIDENCE: Record<EvaluatorRole, string[]> = {
  investor: ["investor", "vc", "partner", "fund"],
  buyer: ["buyer", "procurement", "purchase", "customer"],
  hiring_manager: ["hiring manager", "applications", "resume", "candidate"],
  journalist: ["journalist", "reporter", "pr pitch", "media"],
  moderator: ["moderator", "community", "curation", "membership"],
  unknown: [],
};

function scoreRoleEvidence(text: string, phrases: string[]): number {
  const lower = text.toLowerCase();
  const hits = phrases.filter((p) => lower.includes(p)).length;
  return Math.min(1, hits * 0.35);
}

export function classifyIcp(
  text: string,
  queryCategory?: QueryCategory
): IcpClassification {
  const lower = text.toLowerCase();

  let persuaderScore = 0;
  let persuaderRole: PersuaderRole = "unknown";
  let persuaderEvidence: string[] = [];

  for (const [role, phrases] of Object.entries(PERSUADER_EVIDENCE) as [
    PersuaderRole,
    string[],
  ][]) {
    const score = scoreRoleEvidence(text, phrases);
    const evidence = phrases.filter((p) => lower.includes(p));
    if (score > persuaderScore) {
      persuaderScore = score;
      persuaderRole = role;
      persuaderEvidence = evidence;
    }
  }

  let evaluatorScore = 0;
  let evaluatorRole: EvaluatorRole = "unknown";
  let evaluatorEvidence: string[] = [];

  for (const [role, phrases] of Object.entries(EVALUATOR_EVIDENCE) as [
    EvaluatorRole,
    string[],
  ][]) {
    const score = scoreRoleEvidence(text, phrases);
    const evidence = phrases.filter((p) => lower.includes(p));
    if (score > evaluatorScore) {
      evaluatorScore = score;
      evaluatorRole = role;
      evaluatorEvidence = evidence;
    }
  }

  if (queryCategory === "icp_persuaders") persuaderScore += 0.15;
  if (queryCategory === "icp_evaluators") evaluatorScore += 0.15;

  if (evaluatorScore > persuaderScore && evaluatorScore >= 0.25) {
    return {
      category: "evaluator",
      role: evaluatorRole,
      confidence: Math.min(1, evaluatorScore),
      evidence: evaluatorEvidence,
    };
  }

  if (persuaderScore >= 0.25) {
    return {
      category: "persuader",
      role: persuaderRole,
      confidence: Math.min(1, persuaderScore),
      evidence: persuaderEvidence,
    };
  }

  return {
    category: "unknown",
    role: "unknown",
    confidence: 0.2,
    evidence: [],
  };
}

export function persuaderFitScore(text: string): number {
  const icp = classifyIcp(text, "icp_persuaders");
  const lower = text.toLowerCase();
  const roleFitScore = icp.category === "persuader" ? icp.confidence : 0.2;
  const messagingPainScore = [
    "outreach",
    "cold email",
    "messaging",
    "conversion",
    "trust",
  ].filter((p) => lower.includes(p)).length;
  const commercialUrgencyScore = ["pipeline", "quota", "raise", "hiring"].filter(
    (p) => lower.includes(p)
  ).length;
  const reachableSourceScore = 0.6;
  const recencyScore = 0.5;

  return Math.min(
    1,
    roleFitScore * 0.3 +
      Math.min(1, messagingPainScore * 0.2) * 0.25 +
      Math.min(1, commercialUrgencyScore * 0.25) * 0.2 +
      reachableSourceScore * 0.15 +
      recencyScore * 0.1
  );
}

export function evaluatorFitScore(text: string): number {
  const icp = classifyIcp(text, "icp_evaluators");
  const lower = text.toLowerCase();
  const roleAuthorityScore = icp.category === "evaluator" ? icp.confidence : 0.2;
  const screeningBurdenScore = [
    "inbox",
    "applications",
    "pitches",
    "screening",
  ].filter((p) => lower.includes(p)).length;
  const signalNoiseScore = ["signal to noise", "signal from noise", "ai slop"].filter(
    (p) => lower.includes(p)
  ).length;
  const publicVisibilityScore = ["newsletter", "blog", "vc", "journalist"].filter(
    (p) => lower.includes(p)
  ).length;
  const recencyScore = 0.5;

  return Math.min(
    1,
    roleAuthorityScore * 0.3 +
      Math.min(1, screeningBurdenScore * 0.25) * 0.25 +
      Math.min(1, signalNoiseScore * 0.2) * 0.2 +
      Math.min(1, publicVisibilityScore * 0.25) * 0.15 +
      recencyScore * 0.1
  );
}

export type IcpCategoryResult = IcpCategory;
