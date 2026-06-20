// RSSHub feed-URL builders. Pure string construction (no network). Routes follow
// the examples in 07_source_category_feed_generation.md against a configurable
// base URL.

function joinUrl(base: string, route: string): string {
  return `${base.replace(/\/+$/, "")}/${route.replace(/^\/+/, "")}`;
}

export function buildRsshubUrl(baseUrl: string, route: string): string {
  return joinUrl(baseUrl, route);
}

export const rsshubRoutes = {
  substack: (publication: string) => `rsshub/substack/${publication}`,
  redditSubreddit: (subreddit: string) => `rsshub/reddit/subreddit/${subreddit}`,
  redditSearch: (query: string) =>
    `rsshub/reddit/search/${encodeURIComponent(query)}`,
};

export function rsshubForSubstack(baseUrl: string, publication: string): string {
  return buildRsshubUrl(baseUrl, rsshubRoutes.substack(publication));
}

export function rsshubForSubreddit(baseUrl: string, subreddit: string): string {
  return buildRsshubUrl(baseUrl, rsshubRoutes.redditSubreddit(subreddit));
}

export function rsshubForRedditSearch(baseUrl: string, query: string): string {
  return buildRsshubUrl(baseUrl, rsshubRoutes.redditSearch(query));
}
