# RSS Engine Spec — Internal API Contracts

## API style

- REST endpoints for hackathon speed.
- JSON request/response bodies.
- Use UUIDs for internal IDs.
- All external URLs must be canonicalised before storage.

## POST /api/discovery/search

Runs external discovery through Exa/Tavily and returns candidate URLs and possible feed sources.

### Request

```json
{
  "queryCategory": "pain_signals",
  "queries": ["AI slop cold outreach"],
  "providers": ["exa", "tavily"],
  "platformHints": ["substack", "reddit", "blog"],
  "dateWindowDays": 30,
  "maxResultsPerProvider": 25
}
```

### Response

```json
{
  "results": [
    {
      "provider": "exa",
      "url": "https://example.substack.com/p/post",
      "title": "Example post",
      "summary": "Short summary",
      "publishedAt": "2026-06-15T12:00:00Z",
      "platformHint": "substack",
      "feedCandidates": []
    }
  ]
}
```

## POST /api/discovery/resolve-feed

Resolves a URL to candidate RSS/Atom feed URLs.

### Request

```json
{
  "url": "https://example.substack.com/p/post",
  "platformHint": "substack",
  "strategy": "native_then_rsshub_then_rssbridge_then_rss_app"
}
```

### Response

```json
{
  "resolved": true,
  "selected": {
    "sourceType": "native_rss",
    "feedUrl": "https://example.substack.com/feed",
    "confidence": 0.95
  },
  "candidates": [],
  "rejections": []
}
```

## POST /api/feeds

Registers a feed source.

### Request

```json
{
  "sourceType": "native_rss",
  "originalPlatform": "substack",
  "feedUrl": "https://example.substack.com/feed",
  "homepageUrl": "https://example.substack.com",
  "title": "Example Newsletter",
  "queryCategory": "pain_signals",
  "dateCategory": "trending",
  "pollingIntervalMinutes": 180
}
```

### Response

```json
{
  "id": "00000000-0000-0000-0000-000000000000",
  "active": true,
  "created": true
}
```

## GET /api/feeds

Lists feed sources.

### Query params

```text
?platform=substack&active=true&queryCategory=pain_signals&dateCategory=trending
```

## POST /api/feeds/:id/poll

Polls a feed immediately.

### Response

```json
{
  "feedSourceId": "00000000-0000-0000-0000-000000000000",
  "fetchedItems": 20,
  "newItems": 4,
  "duplicates": 16,
  "errors": []
}
```

## GET /api/items

Search canonical feed items.

### Query params

```text
?q=AI%20slop&platform=substack&publishedAfter=2026-06-01&limit=50
```

## GET /api/signals

Search scored GTM signals.

### Query params

```text
?icpCategory=persuader&minPriorityScore=0.65&minAiSlopScore=0.5&limit=50
```

## POST /api/queries/date-window

Creates or runs a date-window query profile.

### Request

```json
{
  "dateCategory": "recent",
  "windowDays": 7,
  "queries": ["AI slop outbound"],
  "platformHints": ["substack", "reddit"],
  "maxSourcesPerQuery": 20,
  "autoRegisterFeeds": true,
  "pollingIntervalMinutes": 60
}
```

## POST /api/queries/source-category

Creates or runs a source-category query profile.

### Request

```json
{
  "sourceCategory": "substack",
  "queries": ["founder-led sales", "AI outbound"],
  "maxSourcesPerQuery": 50,
  "autoRegisterFeeds": false
}
```

## POST /api/queries/pain-signal

Creates or runs a pain-signal query profile.

### Request

```json
{
  "painCategory": "ai_slop_frustration",
  "queries": ["AI slop", "generic AI outreach", "AI-generated pitches"],
  "dateWindowDays": 30,
  "minPainScore": 0.65,
  "autoRegisterFeeds": true
}
```

## Error response shape

```json
{
  "error": {
    "code": "FEED_VALIDATION_FAILED",
    "message": "Resolved URL did not return a valid RSS or Atom feed.",
    "details": {}
  }
}
```

## Acceptance criteria

- All endpoints should have typed request/response schemas.
- API should be usable from Cursor tests without external calls by mocking provider adapters.
- Every created feed should be traceable to the query that found it.

