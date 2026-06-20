"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import type { RssDashboardStats, RssFeedRow, RssSignalRow } from "@/lib/actions/rss-engine";
import type { TrendCluster } from "@/lib/rss-engine/types";
import { RssFeedPanel } from "@/components/rss/feed-panel";
import { RssSignalPanel } from "@/components/rss/signal-panel";
import { RssDiscoverPanel } from "@/components/rss/discover-panel";
import { Badge } from "@/components/ui/badge";

const TABS = [
  { id: "signals", label: "Signals" },
  { id: "feeds", label: "Feeds" },
  { id: "discover", label: "Discover" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function RssDashboard({
  stats,
  feeds,
  signals,
  trends,
  initialTab,
  signalFilters,
}: {
  stats: RssDashboardStats;
  feeds: RssFeedRow[];
  signals: RssSignalRow[];
  trends: TrendCluster[];
  initialTab: TabId;
  signalFilters: {
    icpCategory?: string;
    queryCategory?: string;
    minPriorityScore?: number;
  };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = (searchParams.get("tab") as TabId) || initialTab;

  function setTab(next: TabId) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", next);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">RSS Engine</h1>
          <p className="text-muted-foreground text-sm max-w-2xl">
            Discover sources, register feeds, poll for new items, and review
            scored GTM signals — all through normalised RSS ingestion.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{stats.feedCount} feeds</Badge>
          <Badge variant="secondary">{stats.itemCount} items</Badge>
          <Badge variant="secondary">{stats.signalCount} signals</Badge>
        </div>
      </div>

      <div className="flex gap-1 border-b pb-px">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              "rounded-t-md px-4 py-2 text-sm font-medium transition-colors",
              tab === item.id
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "signals" && (
        <RssSignalPanel signals={signals} trends={trends} filters={signalFilters} />
      )}
      {tab === "feeds" && <RssFeedPanel feeds={feeds} />}
      {tab === "discover" && <RssDiscoverPanel />}
    </div>
  );
}
