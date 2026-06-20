import { IndividualBoard } from "@/components/individuals/individual-board";
import { getCandidateFilterOptions, getIndividuals } from "@/lib/actions/candidates";
import { individualFiltersSchema } from "@/lib/validators";
import { SIGNAL_BY_CATEGORY, type SignalCategory } from "@/lib/scoring";

function topSignals(
  evidence: { category: string }[],
  limit = 3
): string[] {
  const counts = new Map<string, number>();
  for (const { category } of evidence) {
    counts.set(category, (counts.get(category) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([category]) => {
      const def = SIGNAL_BY_CATEGORY[category as SignalCategory];
      return def?.label ?? category;
    });
}

export default async function IndividualsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const filters = individualFiltersSchema.parse({
    tier: typeof sp.tier === "string" ? sp.tier : undefined,
    classification:
      typeof sp.classification === "string" ? sp.classification : undefined,
    sourceId: typeof sp.sourceId === "string" ? sp.sourceId : undefined,
    outreachStatus:
      typeof sp.outreachStatus === "string" ? sp.outreachStatus : undefined,
  });

  const [individuals, { sources }] = await Promise.all([
    getIndividuals(filters),
    getCandidateFilterOptions(),
  ]);

  const rows = individuals.map((individual) => {
    const score = individual.scores[0];
    const components = (score?.components ?? null) as {
      params?: Record<string, Record<string, number>>;
    } | null;
    return {
      id: individual.id,
      displayName: individual.displayName,
      primaryHandle: individual.primaryHandle,
      currentScore: individual.currentScore,
      currentTier: individual.currentTier,
      classification: individual.classification,
      outreachStatus: individual.outreachStatus,
      isChampion: individual.isChampion,
      contentCount: individual._count.contentItems,
      candidateCount: individual._count.rawCandidates,
      topSignals: topSignals(individual.signalEvidence),
      latestScore: score
        ? {
            championFitScore: score.championFitScore,
            useCaseScore: score.useCaseScore,
            baseScore: score.baseScore,
            frustrationCoefficient: score.frustrationCoefficient,
            adjustedScore: score.adjustedScore,
            dominantMotivation: score.dominantMotivation,
            outreachAngle: score.outreachAngle,
            params: components?.params ?? null,
          }
        : null,
    };
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-4 shrink-0">
        <h1 className="text-2xl font-semibold tracking-tight">
          Prospect board
        </h1>
        <p className="text-muted-foreground text-sm">
          Ranked by adjusted champion score. Filter, inspect the breakdown, and
          re-score as new evidence arrives.
        </p>
      </div>
      <IndividualBoard
        individuals={rows}
        sources={sources.map((s) => ({ id: s.id, label: s.label }))}
        filters={filters}
      />
    </div>
  );
}
