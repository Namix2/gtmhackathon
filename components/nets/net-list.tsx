"use client";

import { useState, useTransition } from "react";
import { Pencil, Play, Plus } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { NetFormDialog } from "@/components/nets/net-form";
import { runNet } from "@/lib/actions/runs";
import { paramsObjectToArray } from "@/lib/validators";

type NetRun = {
  id: string;
  status: string;
  candidateCount: number;
  contentCount: number;
  errorCount: number;
  error: string | null;
  log: unknown;
  startedAt: Date;
  finishedAt: Date | null;
};

type NetRow = {
  id: string;
  name: string;
  description: string | null;
  params: unknown;
  isActive: boolean;
  icpTarget: string;
  sources: { source: { id: string; key: string; label: string; enabled: boolean } }[];
  netRuns: NetRun[];
  _count: { rawCandidates: number };
};

type SourceOption = {
  id: string;
  key: string;
  label: string;
  enabled: boolean;
};

function icpTargetLabel(target: string): string {
  switch (target) {
    case "persuader":
      return "Persuaders";
    case "evaluator":
      return "Evaluators";
    default:
      return "Either ICP";
  }
}

export function NetList({
  nets,
  sources,
}: {
  nets: NetRow[];
  sources: SourceOption[];
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editingNet, setEditingNet] = useState<NetRow | null>(null);

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Nets</h1>
          <p className="text-muted-foreground text-sm">
            Configurable searches linked to one or more sources.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" />
          New net
        </Button>
      </div>

      {nets.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-muted-foreground">No nets yet. Create your first net.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {nets.map((net) => {
            const params = paramsObjectToArray(net.params as Record<string, unknown>);
            return (
              <Card key={net.id}>
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      {net.name}
                      <Badge variant={net.isActive ? "default" : "secondary"}>
                        {net.isActive ? "Active" : "Inactive"}
                      </Badge>
                      <Badge variant="outline">{icpTargetLabel(net.icpTarget)}</Badge>
                    </CardTitle>
                    {net.description && (
                      <CardDescription>{net.description}</CardDescription>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <RunNetButton netId={net.id} />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingNet(net)}
                    >
                      <Pencil className="size-4" />
                      Edit
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="mb-2 text-sm font-medium">Params</p>
                    {params.length === 0 ? (
                      <p className="text-muted-foreground text-sm">No params defined.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {params.map((param) => (
                          <Badge key={param.key} variant="outline">
                            {param.key}: {param.value}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="mb-2 text-sm font-medium">Sources</p>
                    <div className="flex flex-wrap gap-2">
                      {net.sources.length === 0 ? (
                        <span className="text-muted-foreground text-sm">None linked</span>
                      ) : (
                        net.sources.map(({ source }) => (
                          <Badge
                            key={source.id}
                            variant={source.enabled ? "secondary" : "outline"}
                            className={source.enabled ? "" : "opacity-60"}
                            title={
                              source.enabled
                                ? "Enabled"
                                : "Disabled — enable it on the Sources page to include it in runs"
                            }
                          >
                            {source.label}
                            {source.enabled ? "" : " (off)"}
                          </Badge>
                        ))
                      )}
                    </div>
                  </div>
                  <p className="text-muted-foreground text-sm">
                    {net._count.rawCandidates} candidate
                    {net._count.rawCandidates === 1 ? "" : "s"}
                  </p>
                  <LastRun run={net.netRuns[0]} />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <NetFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        sources={sources}
      />

      {editingNet && (
        <NetFormDialog
          open={Boolean(editingNet)}
          onOpenChange={(open) => !open && setEditingNet(null)}
          sources={sources}
          net={{
            ...editingNet,
            sources: editingNet.sources.map(({ source }) => ({
              sourceId: source.id,
            })),
          }}
        />
      )}
    </>
  );
}

function runStatusVariant(
  status: string
): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "succeeded":
      return "default";
    case "partial":
      return "secondary";
    case "failed":
      return "destructive";
    default:
      return "outline";
  }
}

function LastRun({ run }: { run: NetRow["netRuns"][number] | undefined }) {
  if (!run) {
    return (
      <p className="text-muted-foreground text-xs">
        Not run yet. Enable a source, configure it, then press Run.
      </p>
    );
  }

  const sourceErrors = Array.isArray(run.log)
    ? (run.log as { source?: string; error?: string }[]).filter((l) => l?.error)
    : [];

  return (
    <div className="space-y-1 border-t pt-3">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="font-medium">Last run</span>
        <Badge variant={runStatusVariant(run.status)}>{run.status}</Badge>
        <span className="text-muted-foreground">
          {run.candidateCount} candidates · {run.contentCount} content
        </span>
        <span className="text-muted-foreground">
          {new Date(run.startedAt).toLocaleString()}
        </span>
      </div>
      {sourceErrors.length > 0 && (
        <ul className="text-destructive space-y-0.5 text-xs">
          {sourceErrors.map((l, i) => (
            <li key={i}>
              <span className="font-medium">{l.source}:</span> {l.error}
            </li>
          ))}
        </ul>
      )}
      {sourceErrors.length === 0 && run.error && (
        <p className="text-destructive text-xs">{run.error}</p>
      )}
    </div>
  );
}

function RunNetButton({ netId }: { netId: string }) {
  const [isPending, startTransition] = useTransition();

  function handleRun() {
    startTransition(async () => {
      try {
        const result = await runNet(netId);
        if (result.status === "failed") {
          toast.error(
            result.errorCount > 0
              ? "Run failed. Check source credentials and config."
              : "Run failed. Enable and link at least one source."
          );
        } else {
          toast.success(
            `Run ${result.status}: ${result.candidates} candidates, ${result.content} content items`
          );
        }
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to run net"
        );
      }
    });
  }

  return (
    <Button size="sm" onClick={handleRun} disabled={isPending}>
      <Play className="size-4" />
      {isPending ? "Running…" : "Run"}
    </Button>
  );
}
