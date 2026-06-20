# RSS Engine Spec — Date Category: Evergreen Sources

## Category definition

Evergreen sources are high-value publications, authors, communities, or feeds that remain useful independent of immediate publication date.

## Goal

Build a durable feed graph of reliable sources for recurring GTM intelligence.

## Date window

```ts
const EVERGREEN_LOOKBACK_DAYS = 365;
```

## Query examples

```text
best newsletters about founder-led sales
substack sales tech newsletters
blogs about outbound sales and AI
communities discussing startup GTM
investors writing about founder outreach
```

## External discovery endpoints

### Exa

```http
POST https://api.exa.ai/search
x-api-key: ${EXA_API_KEY}
Content-Type: application/json
```

```json
{
  "query": "high quality newsletters and blogs about founder-led sales outbound GTM and AI outreach",
  "numResults": 100,
  "contents": {
    "summary": true,
    "highlights": true
  }
}
```

### Tavily

```http
POST https://api.tavily.com/search
Authorization: Bearer ${TAVILY_API_KEY}
Content-Type: application/json
```

```json
{
  "query": "best Substack newsletters founder-led sales outbound GTM AI outreach",
  "search_depth": "advanced",
  "max_results": 100,
  "include_answer": false,
  "include_raw_content": false
}
```

## Internal endpoint

```http
POST /api/queries/date-window
Content-Type: application/json
```

```json
{
  "dateCategory": "evergreen",
  "windowDays": 365,
  "queries": [
    "founder-led sales newsletters",
    "outbound sales blogs AI",
    "investor newsletters startup GTM"
  ],
  "platformHints": ["substack", "blog", "news"],
  "maxSourcesPerQuery": 100,
  "autoRegisterFeeds": false,
  "pollingIntervalMinutes": 720
}
```

## Source qualification

A source should be marked evergreen when at least two are true:

- Publishes at least monthly.
- Has repeated content matching target GTM themes.
- Has author authority or audience relevance.
- Produces posts with strong engagement or citations.
- Has native RSS or stable RSSHub/RSS-Bridge route.

## Feed source API

```http
POST /api/feeds
Content-Type: application/json
```

```json
{
  "sourceType": "native_rss",
  "originalPlatform": "substack",
  "feedUrl": "https://example.substack.com/feed",
  "homepageUrl": "https://example.substack.com",
  "title": "Example GTM Newsletter",
  "queryCategory": "source_discovery",
  "dateCategory": "evergreen",
  "pollingIntervalMinutes": 720
}
```

## Source scoring

```ts
sourceQualityScore =
  publishingConsistencyScore * 0.25 +
  topicalRelevanceScore * 0.30 +
  authorityScore * 0.25 +
  feedReliabilityScore * 0.20;
```

## Polling rules

- Poll evergreen sources every 12 hours by default.
- Raise to 3-hour polling if a source generates recent high-priority signals.
- Drop to weekly polling if no relevant items are found in 90 days.

## Acceptance criteria

- Evergreen source registration should support manual review before subscription.
- API must expose source quality score and rationale.
- Cursor should implement a `promoteToEvergreen` workflow from candidate source discovery.

