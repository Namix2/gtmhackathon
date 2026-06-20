"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  deleteIndividualSchema,
  toggleChampionSchema,
  updateOutreachStatusSchema,
  type IcpTarget,
  type ToggleChampion,
  type UpdateOutreachStatus,
} from "@/lib/validators";
import { SIGNAL_BY_CATEGORY, type SignalCategory } from "@/lib/scoring";

export async function updateOutreachStatus(input: UpdateOutreachStatus) {
  const parsed = updateOutreachStatusSchema.parse(input);
  await prisma.individual.update({
    where: { id: parsed.individualId },
    data: { outreachStatus: parsed.outreachStatus },
  });
  revalidatePath("/individuals");
  revalidatePath(`/individuals/${parsed.individualId}`);
}

export async function deleteIndividual(input: { individualId: string }) {
  const parsed = deleteIndividualSchema.parse(input);

  await prisma.$transaction(async (tx) => {
    await tx.rawCandidate.updateMany({
      where: { individualId: parsed.individualId },
      data: { individualId: null, dedupeStatus: "unresolved" },
    });

    await tx.contentItem.updateMany({
      where: { individualId: parsed.individualId },
      data: { individualId: null },
    });

    await tx.individual.delete({ where: { id: parsed.individualId } });
  });

  revalidatePath("/individuals");
  revalidatePath("/candidates");
}

export async function toggleChampion(input: ToggleChampion) {
  const parsed = toggleChampionSchema.parse(input);
  await prisma.individual.update({
    where: { id: parsed.individualId },
    data: { isChampion: parsed.isChampion },
  });
  revalidatePath("/individuals");
  revalidatePath(`/individuals/${parsed.individualId}`);
}

function subredditsFromPayload(payload: Prisma.JsonValue | null): string[] {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return [];
  }
  const sub = (payload as Record<string, unknown>).subreddit;
  return typeof sub === "string" ? [sub] : [];
}

// Amplifier loop: spin up a new net seeded from a champion's signals and the
// places/communities where they were found, to discover similar people.
export async function createNetFromChampion(individualId: string) {
  const individual = await prisma.individual.findUnique({
    where: { id: individualId },
    include: {
      rawCandidates: { include: { source: true } },
      contentItems: true,
      signalEvidence: { select: { category: true } },
      scores: { orderBy: { computedAt: "desc" }, take: 1 },
    },
  });
  if (!individual) throw new Error("Individual not found");

  const sourceIds = Array.from(
    new Set(individual.rawCandidates.map((c) => c.sourceId))
  );
  if (sourceIds.length === 0) {
    throw new Error("No sources associated with this person");
  }

  // Top signal categories -> phrase seeds for the new net's keywords.
  const counts = new Map<string, number>();
  for (const { category } of individual.signalEvidence) {
    counts.set(category, (counts.get(category) ?? 0) + 1);
  }
  const topCategories = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([category]) => category as SignalCategory);

  const keywordSeeds = topCategories.flatMap(
    (cat) => SIGNAL_BY_CATEGORY[cat]?.phrases.slice(0, 2) ?? []
  );

  const subreddits = Array.from(
    new Set(
      individual.contentItems.flatMap((item) =>
        subredditsFromPayload(item.rawPayload)
      )
    )
  );

  const classification = individual.scores[0]?.classification ?? "either";
  const icpTarget: IcpTarget =
    classification === "persuader" || classification === "evaluator"
      ? classification
      : "either";

  const net = await prisma.net.create({
    data: {
      name: `Amplifier: ${individual.displayName}`,
      description: `Auto-generated from champion ${individual.displayName} to find similar prospects.`,
      icpTarget,
      isActive: true,
      params: {
        keywords: keywordSeeds.join(", "),
        seedHandle: individual.primaryHandle ?? "",
        seedSubreddits: subreddits.join(", "),
      } as Prisma.InputJsonValue,
      sources: { create: sourceIds.map((sourceId) => ({ sourceId })) },
    },
  });

  revalidatePath("/nets");
  return net.id;
}
