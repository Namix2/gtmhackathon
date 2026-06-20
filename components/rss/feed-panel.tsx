"use client";

import { useState, useTransition } from "react";
import { Play, Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import type { RssFeedRow } from "@/lib/actions/rss-engine";
import {
  pollDueRssFeedsAction,
  pollRssFeedAction,
  registerRssFeed,
  resolveAndRegisterRssFeed,
} from "@/lib/actions/rss-engine";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function RssFeedPanel({ feeds }: { feeds: RssFeedRow[] }) {
  const [addOpen, setAddOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm">
          Registered feed sources and polling status.
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                try {
                  const result = await pollDueRssFeedsAction();
                  toast.success(`Polled ${result.polled} due feed(s)`);
                } catch (error) {
                  toast.error(
                    error instanceof Error ? error.message : "Poll failed"
                  );
                }
              })
            }
          >
            <RefreshCw className="size-4" />
            Poll due feeds
          </Button>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="size-4" />
            Add feed
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Platform</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Poll</TableHead>
              <TableHead>Last polled</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {feeds.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-muted-foreground py-10 text-center"
                >
                  No feeds registered. Use Discover or Add feed to get started.
                </TableCell>
              </TableRow>
            ) : (
              feeds.map((feed) => (
                <TableRow key={feed.id}>
                  <TableCell>
                    <div className="font-medium">{feed.title ?? "—"}</div>
                    <div className="text-muted-foreground max-w-xs truncate font-mono text-xs">
                      {feed.feedUrl}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{feed.originalPlatform}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {feed.dateCategory ?? "—"}
                    {feed.queryCategory && (
                      <span className="text-muted-foreground block text-xs">
                        {feed.queryCategory}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    every {feed.pollingIntervalMinutes}m
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {feed.lastPolledAt ? formatDate(feed.lastPolledAt) : "—"}
                  </TableCell>
                  <TableCell>
                    <PollFeedButton feedId={feed.id} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AddFeedDialog open={addOpen} onOpenChange={setAddOpen} />
    </>
  );
}

function PollFeedButton({ feedId }: { feedId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          try {
            const result = await pollRssFeedAction(feedId);
            toast.success(
              `Fetched ${result.fetchedItems}, ${result.newItems} new, ${result.duplicates} dupes`
            );
          } catch (error) {
            toast.error(
              error instanceof Error ? error.message : "Poll failed"
            );
          }
        })
      }
    >
      <Play className="size-4" />
    </Button>
  );
}

function AddFeedDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [mode, setMode] = useState<"direct" | "resolve">("resolve");
  const [feedUrl, setFeedUrl] = useState("");
  const [pageUrl, setPageUrl] = useState("");
  const [title, setTitle] = useState("");
  const [platform, setPlatform] = useState("unknown");
  const [dateCategory, setDateCategory] = useState("evergreen");
  const [isPending, startTransition] = useTransition();

  function reset() {
    setFeedUrl("");
    setPageUrl("");
    setTitle("");
    setPlatform("unknown");
    setDateCategory("evergreen");
    setMode("resolve");
  }

  function submit() {
    startTransition(async () => {
      try {
        if (mode === "direct") {
          await registerRssFeed({
            feedUrl,
            title: title || undefined,
            originalPlatform: platform as "substack",
            dateCategory: dateCategory as "evergreen",
          });
          toast.success("Feed registered");
        } else {
          await resolveAndRegisterRssFeed({
            url: pageUrl,
            platformHint: platform as "substack",
            title: title || undefined,
            dateCategory: dateCategory as "evergreen",
          });
          toast.success("Feed resolved and registered");
        }
        onOpenChange(false);
        reset();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Registration failed"
        );
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add feed source</DialogTitle>
          <DialogDescription>
            Register a native RSS URL or resolve a page URL to its feed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Mode</Label>
            <Select
              value={mode}
              onValueChange={(v) => setMode(v as "direct" | "resolve")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="resolve">
                  Resolve page URL → feed
                </SelectItem>
                <SelectItem value="direct">Direct feed URL</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {mode === "direct" ? (
            <div className="space-y-2">
              <Label>Feed URL</Label>
              <Input
                placeholder="https://example.substack.com/feed"
                value={feedUrl}
                onChange={(e) => setFeedUrl(e.target.value)}
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Page or homepage URL</Label>
              <Input
                placeholder="https://example.substack.com"
                value={pageUrl}
                onChange={(e) => setPageUrl(e.target.value)}
              />
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Title (optional)</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Platform</Label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[
                    "substack",
                    "reddit",
                    "hackernews",
                    "blog",
                    "news",
                    "unknown",
                  ].map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Date category</Label>
            <Select value={dateCategory} onValueChange={setDateCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Recent</SelectItem>
                <SelectItem value="trending">Trending</SelectItem>
                <SelectItem value="evergreen">Evergreen</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={
              isPending ||
              (mode === "direct" ? !feedUrl.trim() : !pageUrl.trim())
            }
            onClick={submit}
          >
            Register feed
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
