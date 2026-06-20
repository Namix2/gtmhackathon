"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { formatDate, truncate } from "@/lib/utils";

export type ReaderMetrics = {
  likes: number;
  comments: number;
  shares: number;
  views: number;
  score: number | null;
};

export type ReaderContent = {
  id: string;
  type: string;
  title: string | null;
  url: string | null;
  body: string;
  authorHandle: string | null;
  sourceLabel: string;
  publishedAt: string | null;
  metrics: ReaderMetrics | null;
  phrases: string[];
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Render body text with matched signal phrases highlighted.
function highlight(text: string, phrases: string[]): ReactNode {
  if (!text) return text;
  const unique = Array.from(new Set(phrases.filter(Boolean)));
  if (unique.length === 0) return text;

  const pattern = new RegExp(
    `(${unique.map(escapeRegExp).join("|")})`,
    "gi"
  );
  const parts = text.split(pattern);

  return parts.map((part, i) => {
    const isMatch = unique.some((p) => p.toLowerCase() === part.toLowerCase());
    return isMatch ? (
      <mark
        key={i}
        className="bg-yellow-200 text-foreground dark:bg-yellow-500/30"
      >
        {part}
      </mark>
    ) : (
      <span key={i}>{part}</span>
    );
  });
}

function MetricPills({ metrics }: { metrics: ReaderMetrics | null }) {
  if (!metrics) return null;
  const items: [string, number][] = [
    ["Likes", metrics.likes],
    ["Comments", metrics.comments],
    ["Shares", metrics.shares],
    ["Views", metrics.views],
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {items.map(([label, value]) => (
        <Badge key={label} variant="secondary">
          {label}: {value.toLocaleString()}
        </Badge>
      ))}
    </div>
  );
}

export function ContentReader({ content }: { content: ReaderContent[] }) {
  const [active, setActive] = useState<ReaderContent | null>(null);

  const sorted = useMemo(() => content, [content]);

  if (content.length === 0) {
    return (
      <Card>
        <CardContent className="text-muted-foreground py-8 text-center text-sm">
          No content captured yet. Run a net with this person&apos;s source to
          ingest posts.
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid gap-4">
        {sorted.map((item) => (
          <Card
            key={item.id}
            className="cursor-pointer transition-colors hover:bg-accent/40"
            onClick={() => setActive(item)}
          >
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <CardTitle className="text-base">
                  {item.title || truncate(item.body, 70)}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{item.sourceLabel}</Badge>
                  <Badge variant="outline">{item.type}</Badge>
                </div>
              </div>
              <p className="text-muted-foreground text-xs">
                {item.authorHandle ?? "unknown"}
                {item.publishedAt ? ` · ${formatDate(item.publishedAt)}` : ""}
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm leading-relaxed">
                {highlight(truncate(item.body, 240), item.phrases)}
              </p>
              <MetricPills metrics={item.metrics} />
            </CardContent>
          </Card>
        ))}
      </div>

      <Sheet
        open={Boolean(active)}
        onOpenChange={(open) => !open && setActive(null)}
      >
        <SheetContent className="overflow-y-auto sm:max-w-xl">
          {active && (
            <>
              <SheetHeader>
                <SheetTitle>
                  {active.title || "Content"}
                </SheetTitle>
                <SheetDescription>
                  {active.sourceLabel} · {active.authorHandle ?? "unknown"}
                  {active.publishedAt ? ` · ${formatDate(active.publishedAt)}` : ""}
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-4 px-4 pb-6">
                <MetricPills metrics={active.metrics} />
                <div className="text-sm leading-relaxed whitespace-pre-wrap">
                  {highlight(active.body, active.phrases)}
                </div>
                {active.phrases.length > 0 && (
                  <div>
                    <p className="mb-1 text-sm font-medium">Signals detected</p>
                    <div className="flex flex-wrap gap-2">
                      {Array.from(new Set(active.phrases)).map((p) => (
                        <Badge key={p} variant="secondary">
                          {p}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {active.url && (
                  <Button asChild variant="outline" size="sm">
                    <a href={active.url} target="_blank" rel="noreferrer">
                      <ExternalLink className="size-4" />
                      Open original
                    </a>
                  </Button>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
