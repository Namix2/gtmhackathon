import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  type ContactInfo,
  extractContactInfo,
  mergeContactInfo,
  bestContactProfileUrl,
} from "@/lib/rss-engine/extract-contact";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export async function ensureRssDiscoverySource() {
  return prisma.source.upsert({
    where: { key: "rss" },
    create: {
      key: "rss",
      label: "RSS Engine",
      enabled: true,
      config: { autoMapped: true },
    },
    update: { enabled: true },
  });
}

export type MapCandidatesResult = {
  feedCandidates: number;
  authorCandidates: number;
  contentItems: number;
};

export async function mapRssDiscoveryToCandidates(input: {
  queryRunId: string;
  minPriorityScore?: number;
}): Promise<MapCandidatesResult> {
  const source = await ensureRssDiscoverySource();
  const minScore = input.minPriorityScore ?? 0.35;

  const feeds = await prisma.rssFeedSource.findMany({
    where: { queryRunId: input.queryRunId },
  });

  const items = await prisma.rssFeedItem.findMany({
    where: { feedSourceId: { in: feeds.map((f) => f.id) } },
    include: { signal: true, feedSource: true },
  });

  let feedCandidates = 0;
  let authorCandidates = 0;
  let contentItems = 0;

  const authorLinks = new Map<string, string>();
  const authorContacts = new Map<string, ContactInfo>();

  for (const feed of feeds) {
    const feedContact = extractContactInfo({
      text: feed.title,
      urls: [feed.homepageUrl, feed.feedUrl].filter(Boolean) as string[],
    });
    const feedExternalId = `rss-feed:${feed.id}`;
    const feedPayload = {
      feedUrl: feed.feedUrl,
      homepageUrl: feed.homepageUrl,
      platform: feed.originalPlatform,
      queryRunId: input.queryRunId,
      contactInfo: feedContact,
    } satisfies Record<string, unknown>;

    await prisma.rawCandidate.upsert({
      where: {
        sourceId_externalId: { sourceId: source.id, externalId: feedExternalId },
      },
      create: {
        sourceId: source.id,
        externalId: feedExternalId,
        platformHandle: feed.title ?? feed.feedUrl,
        profileUrl: feed.homepageUrl ?? feed.feedUrl,
        matchContext: `RSS feed · ${feed.originalPlatform}`,
        rawPayload: feedPayload as Prisma.InputJsonValue,
      },
      update: {
        platformHandle: feed.title ?? feed.feedUrl,
        profileUrl: feed.homepageUrl ?? feed.feedUrl,
        matchContext: `RSS feed · ${feed.originalPlatform}`,
        rawPayload: feedPayload as Prisma.InputJsonValue,
      },
    });
    feedCandidates += 1;
  }

  for (const item of items) {
    const score = item.signal?.priorityScore ?? 0;
    if (score < minScore && !item.author) continue;

    const authorName =
      item.author?.trim() ||
      item.feedSource.title?.trim() ||
      "Unknown author";
    const authorExternalId = `rss-author:${slugify(authorName)}:${item.feedSource.originalPlatform}`;

    const itemContact = extractContactInfo({
      author: item.author,
      text: [item.summary, item.contentText].filter(Boolean).join("\n"),
      urls: [
        item.url,
        item.feedSource.homepageUrl,
        item.feedSource.feedUrl,
      ].filter(Boolean) as string[],
    });
    const mergedContact = mergeContactInfo(
      authorContacts.get(authorExternalId) ?? {},
      itemContact
    );
    authorContacts.set(authorExternalId, mergedContact);

    const profileUrl =
      bestContactProfileUrl(
        mergedContact,
        item.url ?? item.feedSource.homepageUrl
      ) ?? null;

    if (!authorLinks.has(authorExternalId)) {
      const authorPayload = {
        platform: item.platform,
        feedSourceId: item.feedSourceId,
        queryRunId: input.queryRunId,
        latestPriorityScore: score,
        contactInfo: mergedContact,
      } satisfies Record<string, unknown>;

      const row = await prisma.rawCandidate.upsert({
        where: {
          sourceId_externalId: {
            sourceId: source.id,
            externalId: authorExternalId,
          },
        },
        create: {
          sourceId: source.id,
          externalId: authorExternalId,
          platformHandle: authorName,
          profileUrl,
          matchContext: item.title,
          rawPayload: authorPayload as Prisma.InputJsonValue,
        },
        update: {
          platformHandle: authorName,
          profileUrl: profileUrl ?? undefined,
          matchContext: item.title,
          rawPayload: authorPayload as Prisma.InputJsonValue,
        },
      });
      authorLinks.set(authorExternalId, row.id);
      authorCandidates += 1;
    } else {
      const existing = await prisma.rawCandidate.findUnique({
        where: {
          sourceId_externalId: {
            sourceId: source.id,
            externalId: authorExternalId,
          },
        },
      });
      const priorPayload =
        existing?.rawPayload &&
        typeof existing.rawPayload === "object" &&
        !Array.isArray(existing.rawPayload)
          ? (existing.rawPayload as Record<string, unknown>)
          : {};
      const contactInfo = mergeContactInfo(
        (priorPayload.contactInfo as Partial<ContactInfo> | undefined) ?? {},
        mergedContact
      );
      await prisma.rawCandidate.update({
        where: { id: authorLinks.get(authorExternalId)! },
        data: {
          profileUrl: profileUrl ?? undefined,
          rawPayload: {
            ...priorPayload,
            latestPriorityScore: Math.max(
              Number(priorPayload.latestPriorityScore ?? 0),
              score
            ),
            contactInfo,
          } as Prisma.InputJsonValue,
        },
      });
    }

    const rawCandidateId = authorLinks.get(authorExternalId)!;
    const contentExternalId = `rss-item:${item.id}`;

    await prisma.contentItem.upsert({
      where: {
        sourceId_externalId: { sourceId: source.id, externalId: contentExternalId },
      },
      create: {
        sourceId: source.id,
        rawCandidateId,
        externalId: contentExternalId,
        type: "article",
        url: item.url,
        title: item.title,
        body: item.contentText ?? item.summary ?? "",
        authorHandle: authorName,
        publishedAt: item.publishedAt,
        rawPayload: {
          rssFeedItemId: item.id,
          priorityScore: score,
          icpCategory: item.signal?.icpCategory,
        } as Prisma.InputJsonValue,
      },
      update: {
        rawCandidateId,
        title: item.title,
        body: item.contentText ?? item.summary ?? "",
        url: item.url,
        authorHandle: authorName,
        publishedAt: item.publishedAt,
        rawPayload: {
          rssFeedItemId: item.id,
          priorityScore: score,
          icpCategory: item.signal?.icpCategory,
        } as Prisma.InputJsonValue,
      },
    });
    contentItems += 1;
  }

  return { feedCandidates, authorCandidates, contentItems };
}
