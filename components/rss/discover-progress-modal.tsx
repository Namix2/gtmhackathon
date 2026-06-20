"use client";

import { CheckCircle2, Circle, Loader2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type DiscoverStepId =
  | "prepare"
  | "search"
  | "register"
  | "poll"
  | "map"
  | "complete";

export type DiscoverStepStatus =
  | "pending"
  | "active"
  | "complete"
  | "skipped"
  | "error";

export type DiscoverStep = {
  id: DiscoverStepId;
  label: string;
  status: DiscoverStepStatus;
  detail?: string;
};

export function DiscoverProgressModal({
  open,
  steps,
  error,
  onClose,
}: {
  open: boolean;
  steps: DiscoverStep[];
  error: string | null;
  onClose: () => void;
}) {
  const isRunning = steps.some((s) => s.status === "active");
  const isComplete =
    steps.find((s) => s.id === "complete")?.status === "complete";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !isRunning) onClose();
      }}
    >
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={(e) => isRunning && e.preventDefault()}
        onEscapeKeyDown={(e) => isRunning && e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>
            {error
              ? "Discovery failed"
              : isComplete
                ? "Discovery complete"
                : "Running discovery"}
          </DialogTitle>
          <DialogDescription>
            {error
              ? error
              : isComplete
                ? "Feeds, signals, and candidates are ready. Check Signals or Candidates."
                : "Fast parallel search across Substack, Reddit, YouTube, podcasts, blogs, and news."}
          </DialogDescription>
        </DialogHeader>

        <ol className="space-y-3 py-2">
          {steps.map((step) => (
            <li key={step.id} className="flex gap-3">
              <StepIcon status={step.status} />
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "text-sm font-medium",
                    step.status === "pending" && "text-muted-foreground",
                    step.status === "skipped" && "text-muted-foreground"
                  )}
                >
                  {step.label}
                </p>
                {step.detail && (
                  <p className="text-muted-foreground truncate text-xs">
                    {step.detail}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>

        <DialogFooter>
          <Button disabled={isRunning} onClick={onClose}>
            {isComplete || error ? "Close" : "Cancel"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StepIcon({ status }: { status: DiscoverStepStatus }) {
  if (status === "active") {
    return (
      <Loader2 className="text-primary mt-0.5 size-4 shrink-0 animate-spin" />
    );
  }
  if (status === "complete") {
    return (
      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-green-600 dark:text-green-500" />
    );
  }
  if (status === "error") {
    return <XCircle className="text-destructive mt-0.5 size-4 shrink-0" />;
  }
  return (
    <Circle className="text-muted-foreground mt-0.5 size-4 shrink-0 opacity-60" />
  );
}

export function initialDiscoverSteps(): DiscoverStep[] {
  return [
    { id: "prepare", label: "Preparing query run", status: "pending" },
    {
      id: "search",
      label: "Searching all platforms (parallel)",
      status: "pending",
    },
    {
      id: "register",
      label: "Auto-registering feeds",
      status: "pending",
    },
    {
      id: "poll",
      label: "Polling feeds & scoring (parallel)",
      status: "pending",
    },
    {
      id: "map",
      label: "Mapping to Candidates",
      status: "pending",
    },
    { id: "complete", label: "Done", status: "pending" },
  ];
}

export function setStep(
  steps: DiscoverStep[],
  id: DiscoverStepId,
  patch: Partial<DiscoverStep>
): DiscoverStep[] {
  return steps.map((s) => (s.id === id ? { ...s, ...patch } : s));
}
