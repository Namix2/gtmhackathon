import type { ItemFeatures } from "./features";
import { clamp } from "./util";

// Authority / visibility / champion scoring. Feeds carry no engagement numbers,
// so visibility is a deterministic proxy from platform reach, content depth, and
// topical tags (documented limitation; can be replaced when engagement data is
// available).

const PLATFORM_AUTHORITY: Record<string, number> = {
  news: 0.8,
  hackernews: 0.7,
  substack: 0.6,
  blog: 0.5,
  reddit: 0.4,
  unknown: 0.3,
};

export interface ChampionScores {
  authorityScore: number;
  visibilityScore: number;
  championScore: number;
}

export function scoreChampion(
  features: ItemFeatures,
  painSignalScore: number
): ChampionScores {
  const platformAuthority =
    PLATFORM_AUTHORITY[features.platform] ?? PLATFORM_AUTHORITY.unknown;

  const authorityScore = clamp(
    platformAuthority * 0.5 +
      (features.hasAuthor ? 0.2 : 0) +
      features.icp.confidence * 0.3
  );

  const visibilityScore = clamp(
    platformAuthority * 0.4 +
      clamp(features.contentLength / 2000) * 0.3 +
      clamp(features.tags.length * 0.1, 0, 0.3)
  );

  const championScore = clamp(
    authorityScore * 0.4 + visibilityScore * 0.3 + painSignalScore * 0.3
  );

  return { authorityScore, visibilityScore, championScore };
}
