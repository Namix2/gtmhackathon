"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { importContentSchema, type ImportContentInput } from "@/lib/validators";

// Compliant import adapter for sources without a usable public content API
// (notably LinkedIn). Accepts manually-exported / licensed-provider rows and
// writes them into the same RawCandidate / ContentItem / ProfileSnapshot tables
// the live agents use, so all downstream scoring works identically.
export async function importContent(input: ImportContentInput) {
  const parsed = importContentSchema.parse(input);

  const source = await prisma.source.findUnique({
    where: { key: parsed.sourceKey },
  });
  if (!source) throw new Error(`Source "${parsed.sourceKey}" not found`);

  let candidates = 0;
  let content = 0;
  let metrics = 0;
  let profiles = 0;

  for (const row of parsed.rows) {
    const externalId = row.externalId || row.handle;

    const candidate = await prisma.rawCandidate.upsert({
      where: { sourceId_externalId: { sourceId: source.id, externalId } },
      create: {
        sourceId: source.id,
        externalId,
        platformHandle: row.handle,
        profileUrl: row.profileUrl ?? null,
        matchContext: row.displayName ?? row.title ?? null,
      },
      update: {
        platformHandle: row.handle,
        profileUrl: row.profileUrl ?? null,
      },
    });
    candidates += 1;

    const contentExternalId = row.url || `${externalId}:${content}`;
    const contentItem = await prisma.contentItem.upsert({
      where: {
        sourceId_externalId: {
          sourceId: source.id,
          externalId: contentExternalId,
        },
      },
      create: {
        sourceId: source.id,
        rawCandidateId: candidate.id,
        individualId: candidate.individualId,
        externalId: contentExternalId,
        type: "article",
        url: row.url ?? null,
        title: row.title ?? null,
        body: row.body,
        authorHandle: row.handle,
        publishedAt: row.publishedAt ? new Date(row.publishedAt) : null,
      },
      update: {
        rawCandidateId: candidate.id,
        title: row.title ?? null,
        body: row.body,
      },
    });
    content += 1;

    if (
      row.likes !== undefined ||
      row.comments !== undefined ||
      row.shares !== undefined ||
      row.views !== undefined
    ) {
      await prisma.contentMetricSnapshot.create({
        data: {
          contentItemId: contentItem.id,
          likes: row.likes ?? 0,
          comments: row.comments ?? 0,
          shares: row.shares ?? 0,
          views: row.views ?? 0,
        },
      });
      metrics += 1;
    }

    if (
      row.followers !== undefined ||
      row.following !== undefined ||
      row.posts !== undefined
    ) {
      await prisma.profileSnapshot.create({
        data: {
          sourceId: source.id,
          individualId: candidate.individualId,
          handle: row.handle,
          followers: row.followers ?? 0,
          following: row.following ?? 0,
          posts: row.posts ?? 0,
        } satisfies Prisma.ProfileSnapshotUncheckedCreateInput,
      });
      profiles += 1;
    }
  }

  revalidatePath("/candidates");
  return { candidates, content, metrics, profiles };
}
