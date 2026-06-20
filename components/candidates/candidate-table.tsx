"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import { promoteCandidatesToIndividuals } from "@/lib/actions/candidates";
import { formatDate, truncate } from "@/lib/utils";
import type { DedupeStatus } from "@/lib/validators";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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

type CandidateRow = {
  id: string;
  platformHandle: string | null;
  matchContext: string | null;
  rawPayload: unknown;
  dedupeStatus: string;
  discoveredAt: Date;
  source: { id: string; label: string; key: string };
  net: { id: string; name: string } | null;
};

type FilterOption = { id: string; label?: string; name?: string };

type CandidateFilters = {
  sourceId?: string;
  netId?: string;
  dedupeStatus?: DedupeStatus;
};

type ContactInfoPayload = {
  emails?: string[];
  twitter?: string[];
  linkedin?: string[];
  github?: string[];
  youtube?: string[];
  substack?: string[];
  websites?: string[];
};

function contactFromRawPayload(rawPayload: unknown): ContactInfoPayload | null {
  if (!rawPayload || typeof rawPayload !== "object" || Array.isArray(rawPayload)) {
    return null;
  }
  const info = (rawPayload as Record<string, unknown>).contactInfo;
  if (!info || typeof info !== "object" || Array.isArray(info)) return null;
  return info as ContactInfoPayload;
}

function ContactChips({ contact }: { contact: ContactInfoPayload }) {
  const chips: { label: string; href?: string }[] = [];
  for (const email of contact.emails ?? []) {
    chips.push({ label: email, href: `mailto:${email}` });
  }
  for (const handle of contact.twitter ?? []) {
    const slug = handle.replace(/^@/, "");
    chips.push({ label: handle, href: `https://twitter.com/${slug}` });
  }
  for (const url of [
    ...(contact.linkedin ?? []),
    ...(contact.github ?? []),
    ...(contact.youtube ?? []),
    ...(contact.substack ?? []),
    ...(contact.websites ?? []),
  ]) {
    chips.push({ label: url.replace(/^https?:\/\//, ""), href: url });
  }
  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((chip) => (
        <Badge key={chip.label} variant="secondary" className="font-normal">
          {chip.href ? (
            <a href={chip.href} target="_blank" rel="noreferrer">
              {chip.label}
            </a>
          ) : (
            chip.label
          )}
        </Badge>
      ))}
    </div>
  );
}

function statusLabel(status: string) {
  return status === "merged" ? "promoted" : status;
}

const ALL = "__all__";

export function CandidateTable({
  candidates,
  sources,
  nets,
  filters,
}: {
  candidates: CandidateRow[];
  sources: FilterOption[];
  nets: FilterOption[];
  filters: CandidateFilters;
}) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [detailCandidate, setDetailCandidate] = useState<CandidateRow | null>(
    null
  );
  const [isPending, startTransition] = useTransition();

  const unresolvedSelected = useMemo(
    () =>
      candidates.filter(
        (c) => selectedIds.has(c.id) && c.dedupeStatus === "unresolved"
      ),
    [candidates, selectedIds]
  );

  const selectableIds = useMemo(
    () =>
      candidates
        .filter((c) => c.dedupeStatus === "unresolved")
        .map((c) => c.id),
    [candidates]
  );

  const allSelectableSelected =
    selectableIds.length > 0 &&
    selectableIds.every((id) => selectedIds.has(id));

  function updateFilters(next: Partial<CandidateFilters>) {
    const params = new URLSearchParams();
    const merged = { ...filters, ...next };

    if (merged.sourceId) params.set("sourceId", merged.sourceId);
    if (merged.netId) params.set("netId", merged.netId);
    if (merged.dedupeStatus) params.set("dedupeStatus", merged.dedupeStatus);

    const query = params.toString();
    router.push(query ? `/candidates?${query}` : "/candidates");
  }

  function toggleRow(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggleAll(checked: boolean) {
    if (checked) setSelectedIds(new Set(selectableIds));
    else setSelectedIds(new Set());
  }

  function pushToIndividuals(candidateIds: string[]) {
    startTransition(async () => {
      try {
        const individualIds = await promoteCandidatesToIndividuals({
          candidateIds,
        });
        toast.success(
          `Created ${individualIds.length} individual${individualIds.length === 1 ? "" : "s"}`
        );
        setSelectedIds(new Set());
        setDetailCandidate(null);
        router.push("/individuals");
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to push candidates to individuals"
        );
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-2">
          <Label>Source</Label>
          <Select
            value={filters.sourceId ?? ALL}
            onValueChange={(value) =>
              updateFilters({
                sourceId: value === ALL ? undefined : value,
              })
            }
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All sources" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All sources</SelectItem>
              {sources.map((source) => (
                <SelectItem key={source.id} value={source.id}>
                  {source.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Net</Label>
          <Select
            value={filters.netId ?? ALL}
            onValueChange={(value) =>
              updateFilters({ netId: value === ALL ? undefined : value })
            }
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All nets" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All nets</SelectItem>
              {nets.map((net) => (
                <SelectItem key={net.id} value={net.id}>
                  {net.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Status</Label>
          <Select
            value={filters.dedupeStatus ?? ALL}
            onValueChange={(value) =>
              updateFilters({
                dedupeStatus:
                  value === ALL ? undefined : (value as DedupeStatus),
              })
            }
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All statuses</SelectItem>
              <SelectItem value="unresolved">Unresolved</SelectItem>
              <SelectItem value="merged">Promoted</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="ml-auto">
          <Button
            disabled={unresolvedSelected.length === 0 || isPending}
            onClick={() =>
              pushToIndividuals(unresolvedSelected.map((c) => c.id))
            }
          >
            <UserPlus className="size-4" />
            Push to individuals ({unresolvedSelected.length})
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={allSelectableSelected}
                  onCheckedChange={(checked) => toggleAll(Boolean(checked))}
                  aria-label="Select all unresolved"
                  disabled={selectableIds.length === 0}
                />
              </TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Net</TableHead>
              <TableHead>Handle</TableHead>
              <TableHead>Match context</TableHead>
              <TableHead>Discovered</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {candidates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-muted-foreground py-10 text-center">
                  No candidates match the current filters.
                </TableCell>
              </TableRow>
            ) : (
              candidates.map((candidate) => {
                const isPromoted = candidate.dedupeStatus === "merged";
                return (
                  <TableRow
                    key={candidate.id}
                    className="cursor-pointer"
                    onClick={() => setDetailCandidate(candidate)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.has(candidate.id)}
                        disabled={isPromoted}
                        onCheckedChange={(checked) =>
                          toggleRow(candidate.id, Boolean(checked))
                        }
                        aria-label={`Select ${candidate.platformHandle ?? candidate.id}`}
                      />
                    </TableCell>
                    <TableCell>{candidate.source.label}</TableCell>
                    <TableCell>{candidate.net?.name ?? "—"}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {candidate.platformHandle ?? "—"}
                    </TableCell>
                    <TableCell className="max-w-xs">
                      {truncate(candidate.matchContext, 80)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDate(candidate.discoveredAt)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={isPromoted ? "secondary" : "outline"}>
                        {statusLabel(candidate.dedupeStatus)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Sheet
        open={Boolean(detailCandidate)}
        onOpenChange={(open) => !open && setDetailCandidate(null)}
      >
        <SheetContent className="overflow-y-auto sm:max-w-lg">
          {detailCandidate && (
            <>
              <SheetHeader>
                <SheetTitle>
                  {detailCandidate.platformHandle ?? "Candidate detail"}
                </SheetTitle>
                <SheetDescription>
                  {detailCandidate.source.label}
                  {detailCandidate.net ? ` · ${detailCandidate.net.name}` : ""}
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                {detailCandidate.matchContext && (
                  <div>
                    <p className="mb-1 text-sm font-medium">Match context</p>
                    <p className="text-muted-foreground text-sm">
                      {detailCandidate.matchContext}
                    </p>
                  </div>
                )}
                {(() => {
                  const contact = contactFromRawPayload(
                    detailCandidate.rawPayload
                  );
                  if (!contact) return null;
                  return (
                    <div>
                      <p className="mb-2 text-sm font-medium">
                        Contact & social
                      </p>
                      <ContactChips contact={contact} />
                    </div>
                  );
                })()}
                <div>
                  <p className="mb-1 text-sm font-medium">Raw payload</p>
                  <pre className="bg-muted max-h-[60vh] overflow-auto rounded-md p-3 font-mono text-xs">
                    {JSON.stringify(detailCandidate.rawPayload ?? {}, null, 2)}
                  </pre>
                </div>
                {detailCandidate.dedupeStatus === "unresolved" && (
                  <Button
                    className="w-full"
                    disabled={isPending}
                    onClick={() => pushToIndividuals([detailCandidate.id])}
                  >
                    <UserPlus className="size-4" />
                    Push to individuals
                  </Button>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
