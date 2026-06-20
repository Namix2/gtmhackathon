"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { RssSignalRow } from "@/lib/actions/rss-engine";
import type { TrendCluster } from "@/lib/rss-engine/types";
import { formatDate, truncate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const ALL = "all";

function scorePct(value: number) {
  return `${Math.round(value * 100)}%`;
}

export function RssSignalPanel({
  signals,
  trends,
  filters,
}: {
  signals: RssSignalRow[];
  trends: TrendCluster[];
  filters: {
    icpCategory?: string;
    queryCategory?: string;
    minPriorityScore?: number;
  };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [detail, setDetail] = useState<RssSignalRow | null>(null);

  function setFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "signals");
    if (value === ALL) params.delete(key);
    else params.set(key, value);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <>
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-2">
          <Label>ICP</Label>
          <Select
            value={filters.icpCategory ?? ALL}
            onValueChange={(v) => setFilter("icpCategory", v)}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All ICP" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All ICP</SelectItem>
              <SelectItem value="persuader">Persuader</SelectItem>
              <SelectItem value="evaluator">Evaluator</SelectItem>
              <SelectItem value="unknown">Unknown</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Query category</Label>
          <Select
            value={filters.queryCategory ?? ALL}
            onValueChange={(v) => setFilter("queryCategory", v)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All queries" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All queries</SelectItem>
              <SelectItem value="pain_signals">Pain signals</SelectItem>
              <SelectItem value="icp_persuaders">ICP persuaders</SelectItem>
              <SelectItem value="icp_evaluators">ICP evaluators</SelectItem>
              <SelectItem value="source_discovery">Source discovery</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Min priority</Label>
          <Select
            value={
              filters.minPriorityScore !== undefined
                ? String(filters.minPriorityScore)
                : ALL
            }
            onValueChange={(v) => setFilter("minPriorityScore", v)}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Any</SelectItem>
              <SelectItem value="0.5">≥ 50%</SelectItem>
              <SelectItem value="0.65">≥ 65%</SelectItem>
              <SelectItem value="0.8">≥ 80%</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {trends.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Trending phrases (30d)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {trends.slice(0, 6).map((cluster) => (
                <Badge key={cluster.phrase} variant="secondary">
                  {cluster.phrase} · {cluster.itemCount} items ·{" "}
                  {cluster.uniqueSourceCount} sources
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Author</TableHead>
              <TableHead>ICP</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Pain</TableHead>
              <TableHead>AI slop</TableHead>
              <TableHead>Published</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {signals.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-muted-foreground py-10 text-center"
                >
                  No signals yet. Run Discover or poll a feed to ingest content.
                </TableCell>
              </TableRow>
            ) : (
              signals.map((row) => (
                <TableRow
                  key={row.itemId}
                  className="cursor-pointer"
                  onClick={() => setDetail(row)}
                >
                  <TableCell className="max-w-xs">
                    <div className="font-medium">
                      {truncate(row.item.title, 60)}
                    </div>
                    <div className="text-muted-foreground text-xs">
                      {row.item.platform}
                      {row.item.feedSource.title
                        ? ` · ${row.item.feedSource.title}`
                        : ""}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {row.item.author ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {row.icpCategory}
                      {row.icpRole ? ` / ${row.icpRole}` : ""}
                    </Badge>
                  </TableCell>
                  <TableCell>{scorePct(row.priorityScore)}</TableCell>
                  <TableCell>{scorePct(row.painSignalScore)}</TableCell>
                  <TableCell>{scorePct(row.aiSlopFrustrationScore)}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {row.item.publishedAt
                      ? formatDate(row.item.publishedAt)
                      : "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Sheet open={Boolean(detail)} onOpenChange={(o) => !o && setDetail(null)}>
        <SheetContent className="overflow-y-auto sm:max-w-lg">
          {detail && (
            <>
              <SheetHeader>
                <SheetTitle>{detail.item.title}</SheetTitle>
                <SheetDescription>
                  {detail.item.author ?? "Unknown author"}
                  {detail.item.publishedAt
                    ? ` · ${formatDate(detail.item.publishedAt)}`
                    : ""}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge>Priority {scorePct(detail.priorityScore)}</Badge>
                  <Badge variant="outline">
                    {detail.icpCategory}
                    {detail.icpRole ? ` / ${detail.icpRole}` : ""}
                  </Badge>
                </div>

                {detail.item.url && (
                  <a
                    href={detail.item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary text-sm underline"
                  >
                    Open original
                  </a>
                )}

                {(detail.item.contentText || detail.item.summary) && (
                  <div>
                    <p className="mb-1 text-sm font-medium">Content</p>
                    <p className="text-muted-foreground text-sm whitespace-pre-wrap">
                      {truncate(
                        detail.item.contentText ?? detail.item.summary ?? "",
                        1200
                      )}
                    </p>
                  </div>
                )}

                <div>
                  <p className="mb-1 text-sm font-medium">Scoring rationale</p>
                  <ul className="text-muted-foreground list-inside list-disc text-sm">
                    {(Array.isArray(detail.rationale)
                      ? (detail.rationale as string[])
                      : []
                    ).map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <p className="mb-1 text-sm font-medium">Feed source</p>
                  <p className="text-muted-foreground font-mono text-xs break-all">
                    {detail.item.feedSource.feedUrl}
                  </p>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
