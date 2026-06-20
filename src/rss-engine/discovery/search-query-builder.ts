// Builds provider-specific query strings and date bounds from a base query,
// platform hints, and a date window. Kept separate so query construction is unit
// testable and consistent across providers.

const PLATFORM_DOMAINS: Record<string, string> = {
  substack: "substack.com",
  reddit: "reddit.com",
  hackernews: "news.ycombinator.com",
  blog: "",
  news: "",
};

export function startPublishedDate(now: Date, windowDays?: number): string | undefined {
  if (!windowDays) return undefined;
  const ms = now.getTime() - windowDays * 24 * 3_600_000;
  return new Date(ms).toISOString();
}

// Exa works best with natural-language queries; we pass the query through but
// append a light platform hint when provided.
export function buildExaQuery(query: string, platformHints: string[]): string {
  if (platformHints.length === 0) return query;
  const platforms = platformHints.join(", ");
  return `${query} (sources like ${platforms})`;
}

// Tavily benefits from explicit site: filters.
export function buildTavilyQuery(query: string, platformHints: string[]): string {
  const domains = platformHints
    .map((p) => PLATFORM_DOMAINS[p])
    .filter((d): d is string => Boolean(d));
  if (domains.length === 0) return query;
  const siteFilter = domains.map((d) => `site:${d}`).join(" OR ");
  return `${siteFilter} ${query}`;
}
