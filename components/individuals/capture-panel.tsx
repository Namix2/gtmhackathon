"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Sparkles, Star, Trash2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createNetFromChampion,
  deleteIndividual,
  toggleChampion,
  updateOutreachStatus,
} from "@/lib/actions/individuals";
import { llmEnrichIndividual } from "@/lib/actions/llm";
import {
  OUTREACH_STATUSES,
  outreachStatusLabel,
  tierPlaybook,
} from "@/lib/labels";

export function CapturePanel({
  individualId,
  displayName,
  tier,
  outreachStatus,
  isChampion,
}: {
  individualId: string;
  displayName: string;
  tier: string | null;
  outreachStatus: string;
  isChampion: boolean;
}) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const playbook = tierPlaybook(tier);

  function handleStatusChange(value: string) {
    startTransition(async () => {
      try {
        await updateOutreachStatus({
          individualId,
          outreachStatus: value as (typeof OUTREACH_STATUSES)[number],
        });
        toast.success("Outreach status updated");
      } catch {
        toast.error("Failed to update status");
      }
    });
  }

  function handleToggleChampion() {
    startTransition(async () => {
      try {
        await toggleChampion({ individualId, isChampion: !isChampion });
        toast.success(isChampion ? "Removed champion flag" : "Marked as champion");
        router.refresh();
      } catch {
        toast.error("Failed to update champion");
      }
    });
  }

  function handleCreateNet() {
    startTransition(async () => {
      try {
        await createNetFromChampion(individualId);
        toast.success("Amplifier net created — see Nets");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to create net"
        );
      }
    });
  }

  function handleAiEnrich() {
    startTransition(async () => {
      try {
        const result = await llmEnrichIndividual(individualId);
        toast.success(
          `AI added ${result.signalsAdded} signals and re-scored`
        );
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "AI enrichment failed"
        );
      }
    });
  }

  function handleDelete() {
    startTransition(async () => {
      try {
        await deleteIndividual({ individualId });
        toast.success("Individual deleted");
        setDeleteOpen(false);
        router.push("/individuals");
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to delete individual"
        );
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Capture & outreach</CardTitle>
        <CardDescription>
          Recommended approach for this tier and the amplifier loop.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-muted rounded-md p-3 text-sm">
          <p>
            <span className="font-medium">Channel: </span>
            {playbook.channel}
          </p>
          <p className="mt-1">
            <span className="font-medium">Approach: </span>
            {playbook.approach}
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <p className="text-muted-foreground text-xs">Outreach status</p>
            <Select
              value={outreachStatus}
              onValueChange={handleStatusChange}
              disabled={isPending}
            >
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OUTREACH_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {outreachStatusLabel(status)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            variant={isChampion ? "default" : "outline"}
            onClick={handleToggleChampion}
            disabled={isPending}
          >
            <Star
              className={
                isChampion ? "size-4 fill-current" : "size-4"
              }
            />
            {isChampion ? "Champion" : "Mark champion"}
          </Button>

          <Button
            variant="secondary"
            onClick={handleCreateNet}
            disabled={isPending}
            title="Create a net seeded from this person's signals and sources"
          >
            <Sparkles className="size-4" />
            Create amplifier net
          </Button>

          <Button
            variant="outline"
            onClick={handleAiEnrich}
            disabled={isPending}
            title="Use an LLM to classify signals and draft an angle (requires OPENAI_API_KEY)"
          >
            <Wand2 className="size-4" />
            AI enrich
          </Button>

          <Button
            variant="destructive"
            onClick={() => setDeleteOpen(true)}
            disabled={isPending}
          >
            <Trash2 className="size-4" />
            Delete
          </Button>
        </div>
      </CardContent>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete individual</DialogTitle>
            <DialogDescription>
              Remove {displayName} and unlink their candidates so they can be
              promoted again. Scores and signals for this person will be
              deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isPending}
            >
              Delete individual
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
