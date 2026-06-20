"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { toast } from "sonner";
import type { DiscoverPipelineConfig } from "@/lib/actions/rss-engine";
import {
  discoverPipelineFinishAction,
  discoverPipelineMapCandidatesAction,
  discoverPipelinePollAllAction,
  discoverPipelineRegisterAction,
  discoverPipelineSearchAction,
} from "@/lib/actions/rss-engine";
import {
  DiscoverProgressModal,
  initialDiscoverSteps,
  setStep,
  type DiscoverStep,
} from "@/components/rss/discover-progress-modal";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type QueryKind =
  | "recent"
  | "trending"
  | "evergreen"
  | "pain_signals"
  | "source_category";

type LastResult = {
  registeredFeeds: number;
  candidateFeeds: number;
  mappedAuthors: number;
  mappedContent: number;
  rejectedCandidates: { url: string; reason: string }[];
  label: string;
};

const PRESETS: Record<
  QueryKind,
  { label: string; description: string; queries: string }
> = {
  recent: {
    label: "Recent signals (7d)",
    description:
      "Fresh GTM conversation from Substack, Reddit, YouTube, podcasts, blogs, and news.",
    queries:
      "AI slop outbound\ngeneric AI cold email\nfounder-led sales inbox noise",
  },
  trending: {
    label: "Trending signals (30d)",
    description: "Emerging themes across all RSS-backed platforms.",
    queries:
      "AI slop cold outreach\nAI-generated pitches investor frustration\ngeneric AI sales emails",
  },
  evergreen: {
    label: "Evergreen sources",
    description: "Durable newsletters, channels, and shows.",
    queries:
      "founder-led sales newsletters\noutbound sales podcasts AI\ninvestor youtube GTM",
  },
  pain_signals: {
    label: "Pain signals",
    description: "Frustration with AI-generated outreach across all platforms.",
    queries: "AI slop\ngeneric AI outreach\nAI-generated pitches",
  },
  source_category: {
    label: "Source category",
    description: "Platform-focused discovery (still searches all platforms).",
    queries: "founder-led sales\nAI outbound",
  },
};

export function RssDiscoverPanel() {
  const [kind, setKind] = useState<QueryKind>("pain_signals");
  const [queries, setQueries] = useState(PRESETS.pain_signals.queries);
  const [sourceCategory, setSourceCategory] = useState("substack");
  const [lastResult, setLastResult] = useState<LastResult | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [steps, setSteps] = useState<DiscoverStep[]>(initialDiscoverSteps);
  const [modalError, setModalError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  function applyPreset(next: QueryKind) {
    setKind(next);
    setQueries(PRESETS[next].queries);
  }

  function updateSteps(updater: (prev: DiscoverStep[]) => DiscoverStep[]) {
    setSteps((prev) => updater(prev));
  }

  async function runQuery() {
    const queryList = queries
      .split("\n")
      .map((q) => q.trim())
      .filter(Boolean);

    if (queryList.length === 0) {
      toast.error("Add at least one query");
      return;
    }

    const config: DiscoverPipelineConfig = {
      kind,
      queries: queryList,
      autoRegisterFeeds: true,
      sourceCategory:
        kind === "source_category"
          ? (sourceCategory as DiscoverPipelineConfig["sourceCategory"])
          : undefined,
    };

    setSteps(initialDiscoverSteps());
    setModalError(null);
    setModalOpen(true);
    setIsRunning(true);

    try {
      updateSteps((prev) =>
        setStep(prev, "prepare", {
          status: "complete",
          detail: PRESETS[kind].label,
        })
      );

      updateSteps((prev) =>
        setStep(prev, "search", {
          status: "active",
          detail: `${queryList.length} queries · all platforms`,
        })
      );

      const search = await discoverPipelineSearchAction(config);

      updateSteps((prev) =>
        setStep(prev, "search", {
          status: "complete",
          detail: `${search.resultCount} URLs found`,
        })
      );

      updateSteps((prev) =>
        setStep(prev, "register", {
          status: "active",
          detail: "Registering feeds…",
        })
      );

      const registration = await discoverPipelineRegisterAction({
        queryRunId: search.queryRunId,
        results: search.results,
        config,
      });

      updateSteps((prev) =>
        setStep(prev, "register", {
          status: "complete",
          detail: `${registration.registeredFeeds} new feeds · ${registration.candidateFeeds} total`,
        })
      );

      const feedIds = registration.feedsToPoll.map((f) => f.id);
      let totalNew = 0;

      if (feedIds.length === 0) {
        updateSteps((prev) =>
          setStep(prev, "poll", {
            status: "skipped",
            detail: "No feeds to poll",
          })
        );
      } else {
        updateSteps((prev) =>
          setStep(prev, "poll", {
            status: "active",
            detail: `Polling ${feedIds.length} feeds in parallel…`,
          })
        );

        const pollResults = await discoverPipelinePollAllAction(
          feedIds,
          config
        );
        totalNew = pollResults.reduce((n, r) => n + r.newItems, 0);

        updateSteps((prev) =>
          setStep(prev, "poll", {
            status: "complete",
            detail: `${feedIds.length} feeds · ${totalNew} new items`,
          })
        );
      }

      updateSteps((prev) =>
        setStep(prev, "map", {
          status: "active",
          detail: "Creating feed & author candidates…",
        })
      );

      const mapped = await discoverPipelineMapCandidatesAction(
        search.queryRunId
      );

      updateSteps((prev) =>
        setStep(prev, "map", {
          status: "complete",
          detail: `${mapped.feedCandidates} feeds · ${mapped.authorCandidates} authors · ${mapped.contentItems} posts`,
        })
      );

      updateSteps((prev) =>
        setStep(prev, "complete", {
          status: "complete",
          detail: "Ready in Candidates & Signals",
        })
      );

      setLastResult({
        label: PRESETS[kind].label,
        registeredFeeds: registration.registeredFeeds,
        candidateFeeds: registration.candidateFeeds,
        mappedAuthors: mapped.authorCandidates,
        mappedContent: mapped.contentItems,
        rejectedCandidates: registration.rejectedCandidates,
      });

      await discoverPipelineFinishAction();
      toast.success(
        `Done — ${mapped.authorCandidates} author candidates, ${totalNew} new items`
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Discovery failed";
      setModalError(message);
      setSteps((prev) => {
        const active = prev.find((s) => s.status === "active");
        if (active) {
          return setStep(prev, active.id, { status: "error", detail: message });
        }
        return prev;
      });
      toast.error(message);
    } finally {
      setIsRunning(false);
    }
  }

  function closeModal() {
    if (isRunning) return;
    setModalOpen(false);
    setModalError(null);
  }

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader>
            <CardTitle>Run discovery query</CardTitle>
            <CardDescription>
              Fast parallel search across Substack, Reddit, Hacker News, YouTube,
              podcasts, blogs, and news. Feeds and candidates are mapped
              automatically.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Query profile</Label>
              <Select
                value={kind}
                onValueChange={(v) => applyPreset(v as QueryKind)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(PRESETS) as QueryKind[]).map((key) => (
                    <SelectItem key={key} value={key}>
                      {PRESETS[key].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-xs">
                {PRESETS[kind].description}
              </p>
            </div>

            {kind === "source_category" && (
              <div className="space-y-2">
                <Label>Focus platform (optional label)</Label>
                <Select
                  value={sourceCategory}
                  onValueChange={setSourceCategory}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      "substack",
                      "reddit",
                      "hackernews",
                      "youtube",
                      "podcast",
                      "blog",
                      "news",
                    ].map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Queries (one per line)</Label>
              <Textarea
                rows={6}
                value={queries}
                onChange={(e) => setQueries(e.target.value)}
                className="font-mono text-sm"
              />
            </div>

            <Button disabled={isRunning} onClick={runQuery}>
              <Search className="size-4" />
              {isRunning ? "Running…" : "Run discovery"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Last run</CardTitle>
          </CardHeader>
          <CardContent>
            {!lastResult ? (
              <p className="text-muted-foreground text-sm">
                Results from your most recent discovery run appear here.
              </p>
            ) : (
              <div className="space-y-3 text-sm">
                <p className="font-medium">{lastResult.label}</p>
                <dl className="grid grid-cols-2 gap-2">
                  <dt className="text-muted-foreground">Feeds registered</dt>
                  <dd>{lastResult.registeredFeeds}</dd>
                  <dt className="text-muted-foreground">Feed candidates</dt>
                  <dd>{lastResult.candidateFeeds}</dd>
                  <dt className="text-muted-foreground">Author candidates</dt>
                  <dd>{lastResult.mappedAuthors}</dd>
                  <dt className="text-muted-foreground">Content mapped</dt>
                  <dd>{lastResult.mappedContent}</dd>
                  <dt className="text-muted-foreground">Rejected</dt>
                  <dd>{lastResult.rejectedCandidates.length}</dd>
                </dl>
                <p className="text-muted-foreground text-xs">
                  Review on the Signals tab or merge from Candidates.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <DiscoverProgressModal
        open={modalOpen}
        steps={steps}
        error={modalError}
        onClose={closeModal}
      />
    </>
  );
}
