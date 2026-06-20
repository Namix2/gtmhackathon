export function freshnessMultiplier(ageHours: number): number {
  if (ageHours <= 24) return 1.25;
  if (ageHours <= 72) return 1.15;
  if (ageHours <= 168) return 1.05;
  return 1.0;
}

export function itemAgeHours(publishedAt?: Date | null): number {
  if (!publishedAt) return Number.POSITIVE_INFINITY;
  return (Date.now() - publishedAt.getTime()) / (1000 * 60 * 60);
}

export function recencyScore(publishedAt?: Date | null): number {
  const ageHours = itemAgeHours(publishedAt);
  if (!Number.isFinite(ageHours)) return 0.3;
  if (ageHours <= 24) return 1;
  if (ageHours <= 72) return 0.85;
  if (ageHours <= 168) return 0.7;
  if (ageHours <= 720) return 0.5;
  return 0.25;
}
