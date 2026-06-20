import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ContentReader,
  type ReaderContent,
} from "@/components/individuals/content-reader";
import {
  MetricsPanel,
  type AudiencePoint,
  type ContentTrend,
} from "@/components/individuals/metrics-panel";
import { CapturePanel } from "@/components/individuals/capture-panel";
import { getIndividualDetail } from "@/lib/actions/candidates";
import {
  classificationLabel,
  outreachStatusLabel,
  tierBadgeVariant,
  tierLabel,
} from "@/lib/labels";

export default async function IndividualDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const individual = await getIndividualDetail(id);
  if (!individual) notFound();

  const latestScore = individual.scores[0];

  const readerContent: ReaderContent[] = individual.contentItems.map((item) => {
    const latest = item.metrics[item.metrics.length - 1];
    return {
      id: item.id,
      type: item.type,
      title: item.title,
      url: item.url,
      body: item.body,
      authorHandle: item.authorHandle,
      sourceLabel: item.source.label,
      publishedAt: item.publishedAt
        ? item.publishedAt.toISOString()
        : null,
      metrics: latest
        ? {
            likes: latest.likes,
            comments: latest.comments,
            shares: latest.shares,
            views: latest.views,
            score: latest.score,
          }
        : null,
      phrases: item.signalEvidence.map((e) => e.matchedPhrase),
    };
  });

  const audience: AudiencePoint[] = individual.profileSnapshots.map((p) => {
    const aq = (p.audienceQuality ?? null) as { karma?: number } | null;
    const linkKarma = (aq as { linkKarma?: number } | null)?.linkKarma ?? 0;
    const commentKarma = (aq as { commentKarma?: number } | null)?.commentKarma ?? 0;
    const karma = aq?.karma ?? (linkKarma || commentKarma ? linkKarma + commentKarma : null);
    return {
      capturedAt: p.capturedAt.toISOString(),
      followers: p.followers,
      karma,
    };
  });

  const contentTrends: ContentTrend[] = individual.contentItems
    .filter((item) => item.metrics.length > 0)
    .map((item) => {
      const series = item.metrics.map(
        (m) => m.likes + m.comments + m.shares
      );
      return {
        id: item.id,
        title: item.title || item.body.slice(0, 40),
        latestEngagement: series[series.length - 1] ?? 0,
        series,
      };
    });

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
          <Link href="/individuals">
            <ArrowLeft className="size-4" />
            Back to board
          </Link>
        </Button>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2 text-xl">
                  {individual.displayName}
                  {individual.isChampion && (
                    <Star className="size-5 fill-yellow-400 text-yellow-400" />
                  )}
                </CardTitle>
                <p className="text-muted-foreground text-sm">
                  {individual.primaryHandle ?? "no handle"}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={tierBadgeVariant(individual.currentTier)}>
                  {tierLabel(individual.currentTier)}
                </Badge>
                <Badge variant="outline">
                  {classificationLabel(individual.classification)}
                </Badge>
                <Badge variant="secondary">
                  {outreachStatusLabel(individual.outreachStatus)}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center gap-6 text-sm">
              <div>
                <span className="text-muted-foreground">Adjusted score </span>
                <span className="text-2xl font-semibold">
                  {individual.currentScore?.toFixed(2) ?? "—"}
                </span>
              </div>
              {latestScore && (
                <>
                  <div>
                    <span className="text-muted-foreground">Champion fit </span>
                    <span className="font-medium">
                      {latestScore.championFitScore.toFixed(1)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Use-case </span>
                    <span className="font-medium">
                      {latestScore.useCaseScore.toFixed(1)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Frustration ×</span>
                    <span className="font-medium">
                      {latestScore.frustrationCoefficient.toFixed(2)}
                    </span>
                  </div>
                </>
              )}
            </div>

            {latestScore?.outreachAngle && (
              <div className="bg-muted rounded-md p-3 text-sm">
                <span className="font-medium">Outreach angle: </span>
                {latestScore.outreachAngle}
              </div>
            )}

            {individual.primaryProfileUrl && (
              <Button asChild variant="outline" size="sm">
                <a
                  href={individual.primaryProfileUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalLink className="size-4" />
                  View profile
                </a>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      <CapturePanel
        individualId={individual.id}
        displayName={individual.displayName}
        tier={individual.currentTier}
        outreachStatus={individual.outreachStatus}
        isChampion={individual.isChampion}
      />

      <div>
        <h2 className="mb-3 text-lg font-semibold">Metrics</h2>
        <MetricsPanel audience={audience} contentTrends={contentTrends} />
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">
          Content ({readerContent.length})
        </h2>
        <ContentReader content={readerContent} />
      </div>
    </div>
  );
}
