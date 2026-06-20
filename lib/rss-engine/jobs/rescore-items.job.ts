import { prisma } from "@/lib/db";
import { scoreAndPersistItem } from "../storage/repositories";

export async function rescoreRecentItems(limit = 100): Promise<number> {
  const items = await prisma.rssFeedItem.findMany({
    include: { feedSource: true },
    orderBy: { discoveredAt: "desc" },
    take: limit,
  });

  for (const item of items) {
    await scoreAndPersistItem(item.id, {
      title: item.title,
      summary: item.summary ?? undefined,
      contentText: item.contentText ?? undefined,
      author: item.author ?? undefined,
      platform: item.platform,
      publishedAt: item.publishedAt,
      queryCategory: item.feedSource.queryCategory as
        | "pain_signals"
        | "icp_persuaders"
        | "icp_evaluators"
        | "source_discovery"
        | undefined,
    });
  }

  return items.length;
}
