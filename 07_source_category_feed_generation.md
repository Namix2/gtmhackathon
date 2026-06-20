# RSS Engine Spec — Source Category: Feed Generation and Resolution

## Purpose

Convert external URLs, platforms, and discovered sources into RSS/Atom feed URLs.

## Resolution strategy

```text
1. Try native feed discovery
2. Try known platform URL pattern
3. Try RSSHub route
4. Try RSS-Bridge route
5. Try RSS.app managed feed creation
6. Reject with reason
```

## Native feed discovery

For any homepage or post URL:

1. Fetch HTML.
2. Inspect `<link rel="alternate" type="application/rss+xml">`.
3. Inspect `<link rel="alternate" type="application/atom+xml">`.
4. Try common paths:

```text
/feed
/rss
/rss.xml
/atom.xml
/index.xml
```

## Substack native pattern

```text
https://{publication}.substack.com/feed
```

## Reddit native patterns

```text
https://www.reddit.com/r/{subreddit}/.rss
https://www.reddit.com/r/{subreddit}/search.rss?q={query}&restrict_sr=1&sort=new
```

## RSSHub

Use a configurable base URL:

```bash
RSSHUB_BASE_URL=https://rsshub.app
```

General route construction:

```text
{RSSHUB_BASE_URL}/{route}
```

Examples to implement as URL builders:

```text
/rsshub/substack/{publication}
/rsshub/reddit/subreddit/{subreddit}
/rsshub/reddit/search/{query}
```

Note: RSSHub route availability varies by instance and platform. Self-hosting is recommended for reliable hackathon demos and production control.

## RSS-Bridge

Base URL:

```bash
RSSBRIDGE_BASE_URL=https://rss-bridge.org/bridge01/
```

Generic request pattern:

```text
{RSSBRIDGE_BASE_URL}?action=display&bridge={BridgeName}&format=Atom
```

Example internal builder signature:

```ts
buildRssBridgeUrl({
  bridge: string,
  params: Record<string, string>,
  format?: 'Atom' | 'Html' | 'Json' | 'MediaRSS'
}): string
```

## RSS.app

Base URL:

```text
https://api.rss.app
```

Use for managed feed creation where native RSS/RSSHub/RSS-Bridge fail.

Internal adapter interface:

```ts
interface ManagedFeedProvider {
  createFeed(input: { url: string; title?: string }): Promise<{ feedUrl: string; externalId: string }>;
  getFeed(externalId: string): Promise<{ feedUrl: string; status: string }>;
  deleteFeed(externalId: string): Promise<void>;
}
```

## Internal endpoint

```http
POST /api/discovery/resolve-feed
Content-Type: application/json
```

```json
{
  "url": "https://example.substack.com/p/example-post",
  "platformHint": "substack",
  "strategy": "native_then_rsshub_then_rssbridge_then_rss_app"
}
```

## Expected response

```json
{
  "resolved": true,
  "selected": {
    "sourceType": "native_rss",
    "feedUrl": "https://example.substack.com/feed",
    "confidence": 0.95
  },
  "candidates": [
    {
      "sourceType": "native_rss",
      "feedUrl": "https://example.substack.com/feed",
      "confidence": 0.95
    }
  ],
  "rejections": []
}
```

## Rejection reasons

```ts
type FeedResolutionRejectionReason =
  | 'no_feed_found'
  | 'requires_authentication'
  | 'paywalled'
  | 'blocked_by_robots'
  | 'unsupported_platform'
  | 'invalid_url'
  | 'feed_validation_failed';
```

## Acceptance criteria

- Feed resolution must be deterministic and logged.
- Native RSS should always be preferred over generated feeds.
- Generated feed URLs must include source type metadata.
- Cursor should implement provider adapters behind a common interface.

