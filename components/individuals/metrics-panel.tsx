"use client";

import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Sparkline } from "@/components/individuals/sparkline";
import { truncate } from "@/lib/utils";

export type AudiencePoint = {
  capturedAt: string;
  followers: number;
  karma: number | null;
};

export type ContentTrend = {
  id: string;
  title: string;
  latestEngagement: number;
  series: number[];
};

function Delta({ values }: { values: number[] }) {
  if (values.length < 2) {
    return <Minus className="text-muted-foreground size-3" />;
  }
  const diff = values[values.length - 1] - values[0];
  if (diff > 0) {
    return (
      <span className="flex items-center gap-1 text-green-600">
        <ArrowUp className="size-3" />
        {diff.toLocaleString()}
      </span>
    );
  }
  if (diff < 0) {
    return (
      <span className="flex items-center gap-1 text-red-600">
        <ArrowDown className="size-3" />
        {Math.abs(diff).toLocaleString()}
      </span>
    );
  }
  return <Minus className="text-muted-foreground size-3" />;
}

export function MetricsPanel({
  audience,
  contentTrends,
}: {
  audience: AudiencePoint[];
  contentTrends: ContentTrend[];
}) {
  const followerSeries = audience.map((a) => a.followers);
  const karmaSeries = audience
    .map((a) => a.karma)
    .filter((k): k is number => k !== null);
  const latestFollowers = followerSeries[followerSeries.length - 1] ?? 0;
  const latestKarma = karmaSeries[karmaSeries.length - 1];

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Audience trend</CardTitle>
          <CardDescription>
            From {audience.length} profile snapshot
            {audience.length === 1 ? "" : "s"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {audience.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No profile snapshots yet.
            </p>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-xs">Followers</p>
                  <p className="text-xl font-semibold">
                    {latestFollowers.toLocaleString()}
                  </p>
                  <div className="text-xs">
                    <Delta values={followerSeries} />
                  </div>
                </div>
                <Sparkline values={followerSeries} />
              </div>
              {latestKarma !== undefined && (
                <div className="flex items-center justify-between border-t pt-3">
                  <div>
                    <p className="text-muted-foreground text-xs">Karma</p>
                    <p className="text-xl font-semibold">
                      {latestKarma.toLocaleString()}
                    </p>
                    <div className="text-xs">
                      <Delta values={karmaSeries} />
                    </div>
                  </div>
                  <Sparkline values={karmaSeries} />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Content engagement</CardTitle>
          <CardDescription>
            Total engagement trend per content item
          </CardDescription>
        </CardHeader>
        <CardContent>
          {contentTrends.length === 0 ? (
            <p className="text-muted-foreground text-sm">No content metrics.</p>
          ) : (
            <ul className="space-y-3">
              {contentTrends.map((trend) => (
                <li
                  key={trend.id}
                  className="flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm">
                      {truncate(trend.title, 36)}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {trend.latestEngagement.toLocaleString()} engagements
                    </p>
                  </div>
                  <Sparkline values={trend.series} width={80} height={24} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
