"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  scoreParameterOverrideSchema,
  type ScoreParameterOverride,
} from "@/lib/validators";
import {
  SIGNAL_BY_CATEGORY,
  scanText,
  scoreProspect,
  type SignalCategory,
} from "@/lib/scoring";

// Scan an individual's content and (re)write keyword-detected SignalEvidence.
export async function extractSignalsForIndividual(individualId: string) {
  const contentItems = await prisma.contentItem.findMany({
    where: { individualId },
  });

  // Replace prior keyword evidence; preserve manual + llm evidence.
  await prisma.signalEvidence.deleteMany({
    where: { individualId, detectedBy: "keyword" },
  });

  const rows: Prisma.SignalEvidenceCreateManyInput[] = [];
  for (const item of contentItems) {
    const text = [item.title, item.body].filter(Boolean).join("\n");
    const seen = new Set<string>();
    for (const match of scanText(text)) {
      // Dedupe identical phrase matches within one content item.
      const key = `${item.id}:${match.category}:${match.matchedPhrase}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const def = SIGNAL_BY_CATEGORY[match.category];
      rows.push({
        individualId,
        contentItemId: item.id,
        category: match.category,
        matchedPhrase: match.matchedPhrase,
        weight: def.frustrationWeight ?? 0,
        confidence: 1,
        detectedBy: "keyword",
        excerpt: match.excerpt,
      });
    }
  }

  if (rows.length > 0) {
    await prisma.signalEvidence.createMany({ data: rows });
  }

  return rows.length;
}

function manualOverridesFromComponents(
  components: Prisma.JsonValue | null | undefined
): Record<string, number> | undefined {
  if (!components || typeof components !== "object" || Array.isArray(components)) {
    return undefined;
  }
  const overrides = (components as Record<string, unknown>).overrides;
  if (!overrides || typeof overrides !== "object") return undefined;
  const result: Record<string, number> = {};
  for (const [key, value] of Object.entries(overrides as Record<string, unknown>)) {
    if (typeof value === "number") result[key] = value;
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

// Compute and persist a ProspectScore for an individual from current evidence,
// content, and profile data. Optional manual parameter overrides are merged in.
export async function scoreIndividual(
  individualId: string,
  overrides?: Record<string, number>
) {
  const [individual, contentItems, evidence, profiles] = await Promise.all([
    prisma.individual.findUnique({ where: { id: individualId } }),
    prisma.contentItem.findMany({
      where: { individualId },
      include: { metrics: { orderBy: { capturedAt: "desc" }, take: 1 } },
    }),
    prisma.signalEvidence.findMany({ where: { individualId } }),
    prisma.profileSnapshot.findMany({
      where: { individualId },
      orderBy: { capturedAt: "desc" },
    }),
  ]);

  if (!individual) throw new Error("Individual not found");

  const evidenceByCategory: Partial<Record<SignalCategory, number>> = {};
  for (const row of evidence) {
    const cat = row.category as SignalCategory;
    evidenceByCategory[cat] = (evidenceByCategory[cat] ?? 0) + 1;
  }

  let totalEngagement = 0;
  for (const item of contentItems) {
    const latest = item.metrics[0];
    if (latest) {
      totalEngagement += latest.likes + latest.comments + latest.shares;
    }
  }

  const maxFollowers = profiles.reduce(
    (max, p) => Math.max(max, p.followers),
    0
  );

  const result = scoreProspect(
    {
      contentCount: contentItems.length,
      totalEngagement,
      maxFollowers,
      evidenceByCategory,
    },
    overrides
  );

  const components: Prisma.InputJsonValue = {
    params: result.params,
    persuaderTrack: result.persuaderTrack,
    evaluatorTrack: result.evaluatorTrack,
    ...(overrides ? { overrides } : {}),
  };

  await prisma.$transaction([
    prisma.prospectScore.create({
      data: {
        individualId,
        classification: result.classification,
        dominantMotivation: result.dominantMotivation,
        championFitScore: result.championFitScore,
        useCaseScore: result.useCaseScore,
        baseScore: result.baseScore,
        frustrationCoefficient: result.frustrationCoefficient,
        adjustedScore: result.adjustedScore,
        tier: result.tier,
        outreachAngle: result.outreachAngle,
        components,
      },
    }),
    prisma.individual.update({
      where: { id: individualId },
      data: {
        classification: result.classification,
        dominantMotivation: result.dominantMotivation,
        currentTier: result.tier,
        currentScore: result.adjustedScore,
      },
    }),
  ]);

  revalidatePath("/individuals");
  revalidatePath(`/individuals/${individualId}`);
  return result;
}

// Full refresh for one individual: extract signals then score.
export async function refreshIndividualScore(individualId: string) {
  await extractSignalsForIndividual(individualId);
  // Carry forward any prior manual overrides.
  const latest = await prisma.prospectScore.findFirst({
    where: { individualId },
    orderBy: { computedAt: "desc" },
  });
  const overrides = manualOverridesFromComponents(latest?.components);
  return scoreIndividual(individualId, overrides);
}

export async function applyScoreOverride(input: ScoreParameterOverride) {
  const parsed = scoreParameterOverrideSchema.parse(input);
  return scoreIndividual(parsed.individualId, parsed.parameters);
}

// Re-extract + re-score every individual (used after ingestion).
export async function rescoreAllIndividuals() {
  const individuals = await prisma.individual.findMany({ select: { id: true } });
  for (const { id } of individuals) {
    await refreshIndividualScore(id);
  }
  revalidatePath("/individuals");
  return individuals.length;
}
