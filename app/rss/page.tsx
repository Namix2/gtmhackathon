import { Suspense } from "react";
import { RssDashboard } from "@/components/rss/rss-dashboard";
import {
  getRssFeeds,
  getRssSignals,
  getRssStats,
  getRssTrends,
} from "@/lib/actions/rss-engine";

type SearchParams = Promise<{
  tab?: string;
  icpCategory?: string;
  queryCategory?: string;
  minPriorityScore?: string;
}>;

export default async function RssPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const tab =
    params.tab === "feeds" || params.tab === "discover"
      ? params.tab
      : "signals";

  const minPriorityScore = params.minPriorityScore
    ? Number(params.minPriorityScore)
    : undefined;

  const signalFilters = {
    icpCategory: params.icpCategory,
    queryCategory: params.queryCategory,
    minPriorityScore:
      minPriorityScore && !Number.isNaN(minPriorityScore)
        ? minPriorityScore
        : undefined,
  };

  const [stats, feeds, signals, trends] = await Promise.all([
    getRssStats(),
    getRssFeeds({ active: true }),
    getRssSignals({
      ...signalFilters,
      limit: 50,
    }),
    getRssTrends(30),
  ]);

  return (
    <Suspense fallback={<div className="text-muted-foreground">Loading…</div>}>
      <RssDashboard
        stats={stats}
        feeds={feeds}
        signals={signals}
        trends={trends}
        initialTab={tab}
        signalFilters={signalFilters}
      />
    </Suspense>
  );
}
