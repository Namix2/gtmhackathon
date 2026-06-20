export function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

export function round(value: number, decimals = 4): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

// Saturating score: maps an unbounded non-negative weight sum into 0..1 with
// diminishing returns, so one strong phrase is meaningful but many phrases
// can't push arbitrarily high.
export function saturate(weightSum: number): number {
  return clamp(1 - Math.exp(-weightSum));
}
