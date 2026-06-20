"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { BarChart3, Star } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { ScoreBreakdownDialog } from "@/components/individuals/score-breakdown-dialog";
import { toggleChampion, updateOutreachStatus } from "@/lib/actions/individuals";
import {
  classificationLabel,
  OUTREACH_STATUSES,
  outreachStatusLabel,
  tierBadgeVariant,
  tierShortLabel,
} from "@/lib/labels";
import type { IndividualFilters } from "@/lib/validators";

type LatestScore = {
  championFitScore: number;
  useCaseScore: number;
  baseScore: number;
  frustrationCoefficient: number;
  adjustedScore: number;
  dominantMotivation: string;
  outreachAngle: string | null;
  params: Record<string, Record<string, number>> | null;
};

type BoardIndividual = {
  id: string;
  displayName: string;
  primaryHandle: string | null;
  currentScore: number | null;
  currentTier: string | null;
  classification: string | null;
  outreachStatus: string;
  isChampion: boolean;
  contentCount: number;
  candidateCount: number;
  topSignals: string[];
  latestScore: LatestScore | null;
};

const ALL = "all";

export function IndividualBoard({
  individuals,
  sources,
  filters,
}: {
  individuals: BoardIndividual[];
  sources: { id: string; label: string }[];
  filters: IndividualFilters;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [active, setActive] = useState<BoardIndividual | null>(null);

  function setFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === ALL) params.delete(key);
    else params.set(key, value);
    router.push(`${pathname}?${params.toString()}`);
  }

  if (individuals.length === 0) {
    const hasFilters =
      filters.tier ||
      filters.classification ||
      filters.sourceId ||
      filters.outreachStatus;
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <FilterBar
          filters={filters}
          sources={sources}
          onChange={setFilter}
        />
        <Card className="min-h-0 flex-1">
          <CardContent className="flex h-full flex-col justify-center space-y-4 py-10 text-center">
            <p className="text-muted-foreground">
              {hasFilters
                ? "No individuals match these filters."
                : "No individuals yet. Push candidates from the candidates page."}
            </p>
            {!hasFilters && (
              <Button asChild variant="outline">
                <Link href="/candidates">Review candidates</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <FilterBar filters={filters} sources={sources} onChange={setFilter} />

      <div className="min-h-0 flex-1 overflow-hidden rounded-md border">
        <div className="h-full overflow-auto">
          <Table>
            <TableHeader className="bg-background sticky top-0 z-10 shadow-sm">
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead>Person</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Classification</TableHead>
                <TableHead>Top signals</TableHead>
                <TableHead>Outreach</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {individuals.map((individual, index) => (
                <TableRow key={individual.id}>
                  <TableCell className="text-muted-foreground">
                    {index + 1}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <ChampionStar individual={individual} />
                      <div>
                        <Link
                          href={`/individuals/${individual.id}`}
                          className="font-medium hover:underline"
                        >
                          {individual.displayName}
                        </Link>
                        <p className="text-muted-foreground font-mono text-xs">
                          {individual.primaryHandle ?? "—"} ·{" "}
                          {individual.contentCount} content
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-lg font-semibold">
                    {individual.currentScore?.toFixed(2) ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={tierBadgeVariant(individual.currentTier)}>
                      {tierShortLabel(individual.currentTier)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {classificationLabel(individual.classification)}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {individual.topSignals.length === 0 ? (
                        <span className="text-muted-foreground text-xs">—</span>
                      ) : (
                        individual.topSignals.map((s) => (
                          <Badge key={s} variant="outline" className="text-xs">
                            {s}
                          </Badge>
                        ))
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <OutreachSelect individual={individual} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setActive(individual)}
                    >
                      <BarChart3 className="size-4" />
                      Breakdown
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {active && (
        <ScoreBreakdownDialog
          open={Boolean(active)}
          onOpenChange={(open) => !open && setActive(null)}
          individualId={active.id}
          displayName={active.displayName}
          latestScore={active.latestScore}
        />
      )}
    </div>
  );

  function ChampionStar({ individual }: { individual: BoardIndividual }) {
    return (
      <button
        type="button"
        title={individual.isChampion ? "Champion" : "Mark as champion"}
        onClick={() =>
          startTransition(async () => {
            try {
              await toggleChampion({
                individualId: individual.id,
                isChampion: !individual.isChampion,
              });
            } catch {
              toast.error("Failed to update champion");
            }
          })
        }
      >
        <Star
          className={
            individual.isChampion
              ? "size-4 fill-yellow-400 text-yellow-400"
              : "text-muted-foreground size-4"
          }
        />
      </button>
    );
  }

  function OutreachSelect({ individual }: { individual: BoardIndividual }) {
    return (
      <Select
        value={individual.outreachStatus}
        onValueChange={(value) =>
          startTransition(async () => {
            try {
              await updateOutreachStatus({
                individualId: individual.id,
                outreachStatus: value as (typeof OUTREACH_STATUSES)[number],
              });
            } catch {
              toast.error("Failed to update outreach status");
            }
          })
        }
      >
        <SelectTrigger className="h-8 w-36">
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
    );
  }
}

function FilterBar({
  filters,
  sources,
  onChange,
}: {
  filters: IndividualFilters;
  sources: { id: string; label: string }[];
  onChange: (key: string, value: string) => void;
}) {
  return (
    <div className="mb-3 flex shrink-0 flex-wrap gap-3">
      <FilterSelect
        label="Tier"
        value={filters.tier ?? ALL}
        onChange={(v) => onChange("tier", v)}
        options={[
          { value: ALL, label: "All tiers" },
          { value: "tier1", label: "Tier 1" },
          { value: "tier2", label: "Tier 2" },
          { value: "tier3", label: "Tier 3" },
          { value: "tier4", label: "Tier 4" },
        ]}
      />
      <FilterSelect
        label="Classification"
        value={filters.classification ?? ALL}
        onChange={(v) => onChange("classification", v)}
        options={[
          { value: ALL, label: "All types" },
          { value: "persuader", label: "Persuader" },
          { value: "evaluator", label: "Evaluator" },
          { value: "hybrid", label: "Hybrid" },
        ]}
      />
      <FilterSelect
        label="Source"
        value={filters.sourceId ?? ALL}
        onChange={(v) => onChange("sourceId", v)}
        options={[
          { value: ALL, label: "All sources" },
          ...sources.map((s) => ({ value: s.id, label: s.label })),
        ]}
      />
      <FilterSelect
        label="Outreach"
        value={filters.outreachStatus ?? ALL}
        onChange={(v) => onChange("outreachStatus", v)}
        options={[
          { value: ALL, label: "Any status" },
          ...OUTREACH_STATUSES.map((s) => ({
            value: s,
            label: outreachStatusLabel(s),
          })),
        ]}
      />
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="space-y-1">
      <p className="text-muted-foreground text-xs">{label}</p>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
