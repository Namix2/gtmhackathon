"use client";

import { useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { applyScoreOverride } from "@/lib/actions/scoring";
import { refreshIndividualScore } from "@/lib/actions/scoring";

type ScoreParams = Record<string, Record<string, number>> | null;

const PARAM_LABELS: Record<string, string> = {
  networkLeverage: "Network leverage",
  publicVoice: "Public voice",
  missionAlignment: "Mission alignment",
  workflowRelevance: "Workflow relevance",
  toolAdoption: "Tool adoption",
  outboundIntensity: "Outbound intensity",
  relationshipSensitivity: "Relationship sensitivity",
  commercialUrgency: "Commercial urgency",
  voicePreservation: "Voice preservation",
  inboundVolume: "Inbound volume",
  signalFiltering: "Signal filtering",
  curationAuthority: "Curation authority",
  aiNoiseExposure: "AI-noise exposure",
};

const EDITABLE_GROUPS: { key: string; title: string }[] = [
  { key: "championFit", title: "Champion fit" },
  { key: "persuaderUseCase", title: "Persuader use-case" },
  { key: "evaluatorUseCase", title: "Evaluator use-case" },
];

type LatestScore = {
  championFitScore: number;
  useCaseScore: number;
  baseScore: number;
  frustrationCoefficient: number;
  adjustedScore: number;
  dominantMotivation: string;
  outreachAngle: string | null;
  params: ScoreParams;
};

export function ScoreBreakdownDialog({
  open,
  onOpenChange,
  individualId,
  displayName,
  latestScore,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  individualId: string;
  displayName: string;
  latestScore: LatestScore | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [overrides, setOverrides] = useState<Record<string, number>>({});

  const params = latestScore?.params ?? null;

  function setValue(key: string, value: number) {
    setOverrides((prev) => ({ ...prev, [key]: value }));
  }

  function currentValue(group: string, key: string): number {
    if (key in overrides) return overrides[key];
    return params?.[group]?.[key] ?? 0;
  }

  function handleSave() {
    if (Object.keys(overrides).length === 0) {
      toast.info("No changes to save");
      return;
    }
    startTransition(async () => {
      try {
        await applyScoreOverride({ individualId, parameters: overrides });
        toast.success("Score updated with overrides");
        setOverrides({});
        onOpenChange(false);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to apply override"
        );
      }
    });
  }

  function handleRescore() {
    startTransition(async () => {
      try {
        await refreshIndividualScore(individualId);
        toast.success("Re-scored from evidence");
        setOverrides({});
        onOpenChange(false);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to re-score"
        );
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Score breakdown — {displayName}</DialogTitle>
          <DialogDescription>
            Adjust derived parameters (0–10) to override the computed score, or
            re-score from current evidence.
          </DialogDescription>
        </DialogHeader>

        {!latestScore ? (
          <p className="text-muted-foreground py-6 text-sm">
            No score yet. Re-score to compute one from evidence.
          </p>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              <Stat label="Champion fit" value={latestScore.championFitScore} />
              <Stat label="Use-case" value={latestScore.useCaseScore} />
              <Stat label="Base" value={latestScore.baseScore} />
              <Stat
                label="Frustration ×"
                value={latestScore.frustrationCoefficient}
              />
              <Stat label="Adjusted" value={latestScore.adjustedScore} accent />
            </div>

            <div className="bg-muted rounded-md p-3 text-sm">
              <span className="font-medium">Outreach angle: </span>
              {latestScore.outreachAngle}
            </div>

            {params &&
              EDITABLE_GROUPS.map((group) => {
                const groupParams = params[group.key];
                if (!groupParams) return null;
                return (
                  <div key={group.key} className="space-y-3">
                    <h4 className="text-sm font-semibold">{group.title}</h4>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {Object.keys(groupParams).map((key) => (
                        <div
                          key={key}
                          className="flex items-center justify-between gap-3"
                        >
                          <Label htmlFor={`${group.key}-${key}`} className="text-sm">
                            {PARAM_LABELS[key] ?? key}
                          </Label>
                          <Input
                            id={`${group.key}-${key}`}
                            type="number"
                            min={0}
                            max={10}
                            step={0.5}
                            className="w-20"
                            value={currentValue(group.key, key)}
                            onChange={(e) =>
                              setValue(key, Number(e.target.value))
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
          </div>
        )}

        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            variant="outline"
            onClick={handleRescore}
            disabled={isPending}
          >
            <RefreshCw className="size-4" />
            Re-score from evidence
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            Save overrides
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div className="rounded-md border p-2 text-center">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className={accent ? "text-lg font-bold" : "text-lg font-medium"}>
        {value.toFixed(2)}
      </p>
    </div>
  );
}
