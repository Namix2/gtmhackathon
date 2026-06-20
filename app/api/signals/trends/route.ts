import { prisma } from "@/lib/db";
import { computeTrendClusters } from "@/lib/rss-engine/scoring/trends";
import {
  handleRoute,
  parseNumber,
} from "@/lib/rss-engine/api/route-utils";

export async function GET(request: Request) {
  return handleRoute(async () => {
    const { searchParams } = new URL(request.url);
    const windowDays = parseNumber(searchParams.get("windowDays")) ?? 30;
    const minSources = parseNumber(searchParams.get("minSources")) ?? 3;
    const minScore = parseNumber(searchParams.get("minScore")) ?? 0.65;

    const rows = await prisma.rssScoredSignal.findMany({
      where: { priorityScore: { gte: minScore } },
      include: { item: true },
      take: 500,
    });

    const phraseRows = rows.flatMap((row) => {
      const rationale = Array.isArray(row.rationale)
        ? (row.rationale as string[])
        : [];
      const phraseLine = rationale.find((r) => r.startsWith("matchedPhrases="));
      const phrases =
        phraseLine?.replace("matchedPhrases=", "").split(",").filter(Boolean) ??
        ["ai slop"];

      return phrases.map((phrase) => ({
        id: row.itemId,
        feedSourceId: row.item.feedSourceId,
        phrase: phrase.trim(),
        priorityScore: row.priorityScore,
        publishedAt: row.item.publishedAt,
      }));
    });

    const clusters = computeTrendClusters(phraseRows, windowDays)
      .filter((c) => c.uniqueSourceCount >= minSources)
      .sort((a, b) => b.trendScore - a.trendScore);

    return { windowDays, clusters };
  });
}
