import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { agentRegistry } from "@/lib/agents/registry";
import type { DiscoveryResult, NetRunContext } from "@/lib/agents/types";

// Reusable ingestion core shared by the Server Action (browser-triggered) and
// the CLI runner (cron-triggered). Contains NO Next.js cache/revalidate calls
// so it is safe to run outside a request context.

export type PipelineCounts = {
  candidates: number;
  content: number;
  metrics: number;
  profiles: number;
};

export type RunResult = {
  runId: string;
  status: string;
  errorCount: number;
} & PipelineCounts;

// Consider a "running" NetRun older than this to be stale (process crashed).
const STALE_RUN_MS = 15 * 60 * 1000;

async function persistResult(
  sourceId: string,
  netId: string,
  netRunId: string,
  result: DiscoveryResult
): Promise<PipelineCounts> {
  const counts: PipelineCounts = {
    candidates: 0,
    content: 0,
    metrics: 0,
    profiles: 0,
  };

  const candidateLink = new Map<
    string,
    { id: string; individualId: string | null }
  >();

  for (const candidate of result.candidates) {
    if (!candidate.externalId) continue;
    const rawPayload = (candidate.rawPayload ?? undefined) as
      | Prisma.InputJsonValue
      | undefined;

    const row = await prisma.rawCandidate.upsert({
      where: {
        sourceId_externalId: { sourceId, externalId: candidate.externalId },
      },
      create: {
        sourceId,
        netId,
        netRunId,
        externalId: candidate.externalId,
        platformHandle: candidate.platformHandle ?? null,
        profileUrl: candidate.profileUrl ?? null,
        matchContext: candidate.matchContext ?? null,
        rawPayload,
      },
      update: {
        netId,
        netRunId,
        platformHandle: candidate.platformHandle ?? null,
        profileUrl: candidate.profileUrl ?? null,
        matchContext: candidate.matchContext ?? null,
        ...(rawPayload !== undefined ? { rawPayload } : {}),
      },
    });
    candidateLink.set(candidate.externalId, {
      id: row.id,
      individualId: row.individualId,
    });
    counts.candidates += 1;
  }

  for (const item of result.content) {
    const link = item.candidateExternalId
      ? candidateLink.get(item.candidateExternalId)
      : undefined;
    const rawPayload = (item.rawPayload ?? undefined) as
      | Prisma.InputJsonValue
      | undefined;
    const publishedAt = item.publishedAt ? new Date(item.publishedAt) : null;

    const content = await prisma.contentItem.upsert({
      where: { sourceId_externalId: { sourceId, externalId: item.externalId } },
      create: {
        sourceId,
        netRunId,
        rawCandidateId: link?.id ?? null,
        individualId: link?.individualId ?? null,
        externalId: item.externalId,
        type: item.type ?? "post",
        url: item.url ?? null,
        title: item.title ?? null,
        body: item.body ?? "",
        authorHandle: item.authorHandle ?? null,
        lang: item.lang ?? null,
        publishedAt,
        ...(rawPayload !== undefined ? { rawPayload } : {}),
      },
      update: {
        netRunId,
        rawCandidateId: link?.id ?? null,
        ...(link?.individualId ? { individualId: link.individualId } : {}),
        type: item.type ?? "post",
        url: item.url ?? null,
        title: item.title ?? null,
        body: item.body ?? "",
        authorHandle: item.authorHandle ?? null,
        lang: item.lang ?? null,
        publishedAt,
        ...(rawPayload !== undefined ? { rawPayload } : {}),
      },
    });
    counts.content += 1;

    if (item.metrics) {
      await prisma.contentMetricSnapshot.create({
        data: {
          contentItemId: content.id,
          likes: item.metrics.likes ?? 0,
          comments: item.metrics.comments ?? 0,
          shares: item.metrics.shares ?? 0,
          views: item.metrics.views ?? 0,
          score: item.metrics.score ?? null,
          extra: (item.metrics.extra ?? undefined) as
            | Prisma.InputJsonValue
            | undefined,
        },
      });
      counts.metrics += 1;
    }
  }

  for (const profile of result.profiles) {
    const link = profile.externalId
      ? candidateLink.get(profile.externalId)
      : undefined;
    await prisma.profileSnapshot.create({
      data: {
        sourceId,
        individualId: link?.individualId ?? null,
        handle: profile.handle,
        followers: profile.followers ?? 0,
        following: profile.following ?? 0,
        posts: profile.posts ?? 0,
        audienceQuality: (profile.audienceQuality ?? undefined) as
          | Prisma.InputJsonValue
          | undefined,
      },
    });
    counts.profiles += 1;
  }

  return counts;
}

export class RunInProgressError extends Error {
  constructor() {
    super("A run is already in progress for this net");
    this.name = "RunInProgressError";
  }
}

export async function runNetPipeline(netId: string): Promise<RunResult> {
  const net = await prisma.net.findUnique({
    where: { id: netId },
    include: { sources: { include: { source: true } } },
  });
  if (!net) throw new Error("Net not found");

  // Concurrency guard: refuse to start if a non-stale run is already running.
  const inFlight = await prisma.netRun.findFirst({
    where: {
      netId,
      status: "running",
      startedAt: { gt: new Date(Date.now() - STALE_RUN_MS) },
    },
  });
  if (inFlight) throw new RunInProgressError();

  const enabledSources = net.sources
    .map((s) => s.source)
    .filter((s) => s.enabled);

  const run = await prisma.netRun.create({
    data: { netId, status: "running" },
  });

  const totals: PipelineCounts = {
    candidates: 0,
    content: 0,
    metrics: 0,
    profiles: 0,
  };
  let errorCount = 0;
  const log: Record<string, unknown>[] = [];

  if (enabledSources.length === 0) {
    log.push({ warning: "No enabled sources linked to this net" });
  }

  for (const source of enabledSources) {
    const agent = agentRegistry[source.key];
    if (!agent) {
      errorCount += 1;
      log.push({ source: source.key, error: "No agent registered" });
      continue;
    }

    try {
      const ctx: NetRunContext = {
        id: run.id,
        params: (net.params ?? {}) as Record<string, unknown>,
        sourceConfig: (source.config ?? {}) as Record<string, unknown>,
      };
      const result = await agent.run(ctx);
      const written = await persistResult(source.id, net.id, run.id, result);
      totals.candidates += written.candidates;
      totals.content += written.content;
      totals.metrics += written.metrics;
      totals.profiles += written.profiles;
      log.push({ source: source.key, ...written });
    } catch (error) {
      errorCount += 1;
      log.push({
        source: source.key,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  const anyData = totals.candidates > 0 || totals.content > 0;
  const status =
    errorCount === 0
      ? enabledSources.length === 0
        ? "failed"
        : "succeeded"
      : anyData
        ? "partial"
        : "failed";

  await prisma.netRun.update({
    where: { id: run.id },
    data: {
      status,
      candidateCount: totals.candidates,
      contentCount: totals.content,
      metricCount: totals.metrics,
      profileCount: totals.profiles,
      errorCount,
      error:
        errorCount > 0
          ? `${errorCount} source(s) failed`
          : enabledSources.length === 0
            ? "No enabled sources"
            : null,
      log: log as unknown as Prisma.InputJsonValue,
      finishedAt: new Date(),
    },
  });

  return { runId: run.id, status, ...totals, errorCount };
}
