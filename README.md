# Champion Discovery

Next.js app for champion identification, plus an **RSS-first ingestion engine** that normalises every external source into feed items before classification, scoring, and retrieval.

## Quick start (local)

```bash
npm install
cp .env.example .env.local
npx prisma db push
npm run db:seed   # optional demo data for the main app
npm run dev
```

App: [http://localhost:3000](http://localhost:3000)

## RSS Engine

The RSS engine lives under `lib/rss-engine/` and exposes REST endpoints under `/api/*`. All external platforms (Reddit, Substack, blogs, Hacker News, news) enter through native or generated RSS/Atom feeds — not platform-specific scrapers.

### Architecture

```text
Query / Seed Source → Discovery (Exa/Tavily) → Feed URL Resolution
  → Feed Registry → Feed Poller → Canonical Items → Dedup → Scoring → API
```

Module boundaries:

| Module | Path |
|---|---|
| Feed discovery | `lib/rss-engine/discovery/` |
| Feed resolution | `lib/rss-engine/discovery/feed-url-resolver.ts` |
| RSS ingestion | `lib/rss-engine/feeds/` |
| Content normalisation | `lib/rss-engine/items/canonicalizer.ts` |
| Deduplication | `lib/rss-engine/items/deduper.ts` |
| Classification & scoring | `lib/rss-engine/scoring/` |
| Persistence | `lib/rss-engine/storage/repositories.ts` |
| API layer | `app/api/**` |

Specs: `00_rss_engine_overview.md` … `08_internal_api_contracts.md` (repo root).

### Required environment variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | SQLite path (default `file:./dev.db`) |
| `EXA_API_KEY` | No | Exa semantic search (mocked if unset) |
| `TAVILY_API_KEY` | No | Tavily web search (mocked if unset) |
| `RSSHUB_BASE_URL` | No | RSSHub instance (default public) |
| `RSSBRIDGE_BASE_URL` | No | RSS-Bridge instance |
| `RSS_APP_API_KEY` | No | RSS.app managed feeds (mocked if unset) |
| `DEFAULT_POLL_INTERVAL_MINUTES` | No | Default feed poll interval |
| `USER_AGENT` | No | HTTP User-Agent for feed fetches |
| `RSS_ENGINE_MOCK_PROVIDERS` | No | Force mock Exa/Tavily/RSS.app |

See [`.env.example`](.env.example) for the full list.

### Trigger ingestion

**1. Register a feed directly**

```bash
curl -X POST http://localhost:3000/api/feeds \
  -H "Content-Type: application/json" \
  -d '{
    "sourceType": "native_rss",
    "originalPlatform": "substack",
    "feedUrl": "https://example.substack.com/feed",
    "title": "Example Newsletter",
    "dateCategory": "evergreen",
    "pollingIntervalMinutes": 720
  }'
```

**2. Poll a feed immediately**

```bash
curl -X POST http://localhost:3000/api/feeds/{feedId}/poll
```

**3. Run a date-window query** (recent / trending / evergreen)

```bash
curl -X POST http://localhost:3000/api/queries/date-window \
  -H "Content-Type: application/json" \
  -d '{
    "dateCategory": "recent",
    "windowDays": 7,
    "queries": ["AI slop outbound"],
    "platformHints": ["substack", "reddit"],
    "autoRegisterFeeds": true,
    "pollingIntervalMinutes": 60
  }'
```

**4. Run a pain-signal query**

```bash
curl -X POST http://localhost:3000/api/queries/pain-signal \
  -H "Content-Type: application/json" \
  -d '{
    "painCategory": "ai_slop_frustration",
    "queries": ["AI slop", "generic AI outreach"],
    "dateWindowDays": 30,
    "autoRegisterFeeds": true
  }'
```

**5. Poll all due feeds (cron / CLI)**

```bash
npm run rss:poll
```

### Internal API endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/discovery/search` | POST | Exa/Tavily discovery |
| `/api/discovery/resolve-feed` | POST | URL → RSS feed candidates |
| `/api/feeds` | GET/POST | List / register feeds |
| `/api/feeds/:id/poll` | POST | Poll one feed now |
| `/api/items` | GET | Search canonical items |
| `/api/signals` | GET | Search scored GTM signals |
| `/api/signals/trends` | GET | Trending phrase clusters |
| `/api/queries/date-window` | POST | Recent / trending / evergreen |
| `/api/queries/source-category` | POST | Source-category discovery |
| `/api/queries/pain-signal` | POST | Pain-signal subscriptions |

Request/response shapes are defined in `lib/rss-engine/validation/schemas.ts` and `08_internal_api_contracts.md`.

### Tests

```bash
npm test
```

Tests use mock discovery providers by default (`RSS_ENGINE_MOCK_PROVIDERS=true`) so no production API keys are required.

### Existing champion-discovery pipeline

The original net/source agents (`lib/agents/`, `lib/pipeline.ts`) remain available. The RSS engine is the canonical ingestion path for feed-normalised content; use `npm run nets:run` for the legacy net runner.

## Production notes

- Use a persistent disk for SQLite, or migrate the RSS engine tables to Postgres.
- Schedule `npm run rss:poll` via cron (e.g. every 15–60 minutes).
- Set real `EXA_API_KEY` / `TAVILY_API_KEY` and self-host RSSHub/RSS-Bridge for reliable feed generation.
