import { CandidateTable } from "@/components/candidates/candidate-table";
import {
  getCandidateFilterOptions,
  getCandidates,
} from "@/lib/actions/candidates";
import type { DedupeStatus } from "@/lib/validators";

type PageProps = {
  searchParams: Promise<{
    sourceId?: string;
    netId?: string;
    dedupeStatus?: string;
  }>;
};

export default async function CandidatesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const dedupeStatus =
    params.dedupeStatus === "unresolved" || params.dedupeStatus === "merged"
      ? (params.dedupeStatus as DedupeStatus)
      : undefined;

  const filters = {
    sourceId: params.sourceId,
    netId: params.netId,
    dedupeStatus,
  };

  const [candidates, filterOptions] = await Promise.all([
    getCandidates(filters),
    getCandidateFilterOptions(),
  ]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Candidates</h1>
        <p className="text-muted-foreground text-sm">
          Raw discovery matches. Select one or more unresolved candidates and
          push each to the Individuals board as its own person.
        </p>
      </div>
      <CandidateTable
        candidates={candidates}
        sources={filterOptions.sources}
        nets={filterOptions.nets}
        filters={filters}
      />
    </div>
  );
}
