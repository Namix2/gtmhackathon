"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import {
  candidateFiltersSchema,
  individualFiltersSchema,
  promoteCandidatesSchema,
  promoteCandidateSchema,
  type DedupeStatus,
  type IndividualFilters,
} from "@/lib/validators";
import { refreshIndividualScore } from "@/lib/actions/scoring";
import {
  type ContactInfo,
  mergeContactInfo,
  bestContactProfileUrl,
  bestContactHandle,
} from "@/lib/rss-engine/extract-contact";

export type CandidateFilters = {
  sourceId?: string;
  netId?: string;
  dedupeStatus?: DedupeStatus;
};

export async function getCandidates(filters: CandidateFilters = {}) {
  const parsed = candidateFiltersSchema.parse(filters);

  return prisma.rawCandidate.findMany({
    where: {
      ...(parsed.sourceId ? { sourceId: parsed.sourceId } : {}),
      ...(parsed.netId ? { netId: parsed.netId } : {}),
      ...(parsed.dedupeStatus ? { dedupeStatus: parsed.dedupeStatus } : {}),
    },
    include: {
      source: true,
      net: true,
      individual: true,
      _count: { select: { contentItems: true } },
    },
    orderBy: { discoveredAt: "desc" },
  });
}

export async function getCandidateFilterOptions() {
  const [sources, nets] = await Promise.all([
    prisma.source.findMany({ orderBy: { label: "asc" } }),
    prisma.net.findMany({ orderBy: { name: "asc" } }),
  ]);
  return { sources, nets };
}

function contactFromPayload(payload: Prisma.JsonValue | null): ContactInfo | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }
  const info = (payload as Record<string, unknown>).contactInfo;
  if (!info || typeof info !== "object" || Array.isArray(info)) return null;
  return info as ContactInfo;
}

function aggregateContactFromCandidates(
  candidates: { rawPayload: Prisma.JsonValue | null; profileUrl: string | null }[]
): ContactInfo {
  let merged = mergeContactInfo();
  for (const c of candidates) {
    const fromPayload = contactFromPayload(c.rawPayload);
    if (fromPayload) merged = mergeContactInfo(merged, fromPayload);
  }
  return merged;
}

function defaultDisplayName(platformHandle: string | null): string {
  if (!platformHandle) return "Unknown";
  const cleaned = platformHandle.replace(/^[@u/]+/, "").trim();
  return cleaned || platformHandle;
}

async function createIndividualFromCandidates(input: {
  candidateIds: string[];
  displayName: string;
  primaryHandle?: string;
}) {
  const candidates = await prisma.rawCandidate.findMany({
    where: { id: { in: input.candidateIds } },
    include: { source: true },
  });

  if (candidates.length !== input.candidateIds.length) {
    throw new Error("One or more candidates were not found");
  }

  const alreadyMerged = candidates.filter((c) => c.dedupeStatus === "merged");
  if (alreadyMerged.length > 0) {
    throw new Error("One or more selected candidates are already merged");
  }

  const handles = candidates
    .map((c) => c.platformHandle)
    .filter((h): h is string => Boolean(h));
  const contact = aggregateContactFromCandidates(candidates);
  const fallbackProfileUrl = candidates.find((c) => c.profileUrl)?.profileUrl;
  const primaryProfileUrl =
    bestContactProfileUrl(contact, fallbackProfileUrl) ?? null;
  const primaryHandle =
    input.primaryHandle ||
    bestContactHandle(contact, handles[0] ?? null) ||
    handles[0] ||
    null;

  const individualId = await prisma.$transaction(async (tx) => {
    const individual = await tx.individual.create({
      data: {
        displayName: input.displayName,
        primaryHandle,
        primaryProfileUrl,
        status: "pending_enrichment",
      },
    });

    await tx.rawCandidate.updateMany({
      where: { id: { in: input.candidateIds } },
      data: { individualId: individual.id, dedupeStatus: "merged" },
    });

    await tx.contentItem.updateMany({
      where: { rawCandidateId: { in: input.candidateIds } },
      data: { individualId: individual.id },
    });

    if (handles.length > 0) {
      await tx.profileSnapshot.updateMany({
        where: { handle: { in: handles }, individualId: null },
        data: { individualId: individual.id },
      });
    }

    const rssSourceId = candidates.find((c) => c.source.key === "rss")?.sourceId;
    if (Object.values(contact).some((arr) => arr.length > 0)) {
      await tx.profileSnapshot.create({
        data: {
          individualId: individual.id,
          sourceId: rssSourceId ?? candidates[0]?.sourceId ?? null,
          handle: primaryHandle,
          audienceQuality: { contactInfo: contact } as Prisma.InputJsonValue,
        },
      });
    }

    return individual.id;
  });

  try {
    await refreshIndividualScore(individualId);
  } catch {
    // Scoring is best-effort.
  }

  revalidatePath("/candidates");
  revalidatePath("/individuals");
  revalidatePath(`/individuals/${individualId}`);
  return individualId;
}

export async function promoteCandidatesToIndividuals(input: {
  candidateIds: string[];
}) {
  const parsed = promoteCandidatesSchema.parse(input);

  const candidates = await prisma.rawCandidate.findMany({
    where: { id: { in: parsed.candidateIds } },
    orderBy: { discoveredAt: "desc" },
  });

  if (candidates.length !== parsed.candidateIds.length) {
    throw new Error("One or more candidates were not found");
  }

  const alreadyPromoted = candidates.filter((c) => c.dedupeStatus === "merged");
  if (alreadyPromoted.length > 0) {
    throw new Error("One or more selected candidates are already promoted");
  }

  const individualIds: string[] = [];
  for (const candidate of candidates) {
    const individualId = await createIndividualFromCandidates({
      candidateIds: [candidate.id],
      displayName: defaultDisplayName(candidate.platformHandle),
      primaryHandle: candidate.platformHandle ?? undefined,
    });
    individualIds.push(individualId);
  }

  return individualIds;
}

export async function promoteCandidateToIndividual(input: {
  candidateId: string;
  displayName: string;
  primaryHandle?: string;
}) {
  const parsed = promoteCandidateSchema.parse(input);
  return createIndividualFromCandidates({
    candidateIds: [parsed.candidateId],
    displayName: parsed.displayName,
    primaryHandle: parsed.primaryHandle,
  });
}

export async function getIndividuals(filters: IndividualFilters = {}) {
  const parsed = individualFiltersSchema.parse(filters);

  const individuals = await prisma.individual.findMany({
    where: {
      ...(parsed.tier ? { currentTier: parsed.tier } : {}),
      ...(parsed.classification ? { classification: parsed.classification } : {}),
      ...(parsed.outreachStatus ? { outreachStatus: parsed.outreachStatus } : {}),
      ...(parsed.sourceId
        ? { rawCandidates: { some: { sourceId: parsed.sourceId } } }
        : {}),
    },
    include: {
      _count: { select: { rawCandidates: true, contentItems: true } },
      scores: { orderBy: { computedAt: "desc" }, take: 1 },
      signalEvidence: { select: { category: true } },
    },
    orderBy: [{ currentScore: "desc" }, { createdAt: "desc" }],
  });

  return individuals;
}

export async function getIndividualDetail(id: string) {
  return prisma.individual.findUnique({
    where: { id },
    include: {
      contentItems: {
        include: {
          source: true,
          metrics: { orderBy: { capturedAt: "asc" } },
          signalEvidence: true,
        },
        orderBy: { publishedAt: "desc" },
      },
      profileSnapshots: { orderBy: { capturedAt: "asc" } },
      signalEvidence: { orderBy: { createdAt: "desc" } },
      scores: { orderBy: { computedAt: "desc" }, take: 1 },
      rawCandidates: { include: { source: true, net: true } },
    },
  });
}
