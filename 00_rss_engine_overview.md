# RSS Engine Architecture Spec — Overview

## Purpose

Build an RSS-first ingestion engine where every external content source is normalised into feed items before downstream analysis. The engine should support discovery, feed generation, polling, parsing, deduplication, enrichment, scoring, and search.

## Core design principle

All external sources must enter through one of these paths:

1. Native RSS/Atom feed URL
2. Generated RSS feed URL via RSSHub/RSS-Bridge/RSS.app
3. Search-discovered URL that is converted into a feed subscription
4. Manual seed feed URL

No downstream classifier should know whether the original content came from Reddit, Substack, Hacker News, blogs, newsletters, or news sites.

```text
Query / Seed Source
    ↓
Source Discovery
    ↓
RSS Feed URL Resolution
    ↓
Feed Subscription Registry
    ↓
Feed Poller
    ↓
Feed Item Parser
    ↓
Canonical Content Store
    ↓
Deduplication + Enrichment
    ↓
Signal Scoring
    ↓
Search / API / UI
```

## External services

| Service | Role | Notes |
|---|---|---|
| Exa | Semantic web/source discovery | Good for natural-language discovery queries. Endpoint: `POST https://api.exa.ai/search` |
| Tavily | Web search and content extraction | Good for agentic search. Endpoint: `POST https://api.tavily.com/search` |
| RSSHub | Generate feeds for platforms | Public routes usually no API key; self-host recommended. |
| RSS-Bridge | Generate feeds for sites without RSS | PHP app; self-host recommended. |
| RSS.app | Managed feed generation | API base: `https://api.rss.app` |
| Native RSS/Atom | Direct ingestion | Preferred where available. |

## Internal modules

```text
/src
  /api
    discovery.routes.ts
    feeds.routes.ts
    items.routes.ts
    queries.routes.ts
  /discovery
    exa.client.ts
    tavily.client.ts
    search-query-builder.ts
    feed-url-resolver.ts
  /feeds
    feed-poller.ts
    feed-parser.ts
    feed-validator.ts
    feed-registry.ts
    rsshub-url-builder.ts
    rssbridge-url-builder.ts
  /items
    canonicalizer.ts
    deduper.ts
    content-extractor.ts
    metadata-enricher.ts
  /scoring
    icp-classifier.ts
    ai-slop-frustration.ts
    champion-scorer.ts
    priority-matrix.ts
  /storage
    db.ts
    repositories.ts
  /jobs
    poll-feeds.job.ts
    discover-sources.job.ts
    rescore-items.job.ts
```

## Canonical entities

### FeedSource

```ts
interface FeedSource {
  id: string;
  sourceType: 'native_rss' | 'rsshub' | 'rssbridge' | 'rss_app' | 'manual';
  originalPlatform: 'substack' | 'reddit' | 'hackernews' | 'blog' | 'news' | 'unknown';
  feedUrl: string;
  homepageUrl?: string;
  title?: string;
  queryCategory?: string;
  dateCategory?: string;
  pollingIntervalMinutes: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### FeedItem

```ts
interface FeedItem {
  id: string;
  feedSourceId: string;
  url: string;
  canonicalUrl: string;
  title: string;
  summary?: string;
  contentText?: string;
  author?: string;
  publishedAt?: string;
  discoveredAt: string;
  platform: string;
  tags: string[];
  contentHash: string;
  externalId?: string;
}
```

### ScoredSignal

```ts
interface ScoredSignal {
  itemId: string;
  icpCategory: 'persuader' | 'evaluator' | 'unknown';
  painSignalScore: number;
  aiSlopFrustrationScore: number;
  authorityScore: number;
  visibilityScore: number;
  championScore: number;
  priorityScore: number;
  rationale: string[];
  scoredAt: string;
}
```

## Required environment variables

```bash
EXA_API_KEY=
TAVILY_API_KEY=
RSSHUB_BASE_URL=https://rsshub.app
RSSBRIDGE_BASE_URL=https://rss-bridge.org/bridge01/
RSS_APP_API_KEY=
DATABASE_URL=
REDIS_URL=
DEFAULT_POLL_INTERVAL_MINUTES=60
USER_AGENT=LightfernRSSBot/0.1
```

## Database tables

```sql
create table feed_sources (
  id uuid primary key,
  source_type text not null,
  original_platform text not null,
  feed_url text not null unique,
  homepage_url text,
  title text,
  query_category text,
  date_category text,
  polling_interval_minutes int not null default 60,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table feed_items (
  id uuid primary key,
  feed_source_id uuid references feed_sources(id),
  url text not null,
  canonical_url text not null,
  title text not null,
  summary text,
  content_text text,
  author text,
  published_at timestamptz,
  discovered_at timestamptz not null default now(),
  platform text not null,
  tags text[] not null default '{}',
  content_hash text not null,
  external_id text,
  unique(canonical_url),
  unique(content_hash)
);

create table scored_signals (
  item_id uuid primary key references feed_items(id),
  icp_category text not null,
  pain_signal_score numeric not null,
  ai_slop_frustration_score numeric not null,
  authority_score numeric not null,
  visibility_score numeric not null,
  champion_score numeric not null,
  priority_score numeric not null,
  rationale jsonb not null,
  scored_at timestamptz not null default now()
);
```

## Internal API overview

| Endpoint | Method | Purpose |
|---|---:|---|
| `/api/discovery/search` | POST | Run external search and return candidate sources/items. |
| `/api/discovery/resolve-feed` | POST | Convert URL/platform/query into RSS feed URLs. |
| `/api/feeds` | POST | Register a feed source. |
| `/api/feeds` | GET | List registered feeds. |
| `/api/feeds/:id/poll` | POST | Poll one feed immediately. |
| `/api/items` | GET | Search/filter canonical feed items. |
| `/api/signals` | GET | Search scored GTM signals. |
| `/api/queries/date-window` | POST | Create date-window query subscriptions. |
| `/api/queries/source-category` | POST | Create source-category query subscriptions. |
| `/api/queries/pain-signal` | POST | Create pain-signal query subscriptions. |

## Implementation priority

1. Native RSS ingestion
2. RSSHub URL generation
3. Feed polling and canonical storage
4. Deduplication
5. Exa/Tavily discovery
6. RSS-Bridge fallback
7. RSS.app managed-feed fallback
8. Scoring pipeline
9. UI/API search

