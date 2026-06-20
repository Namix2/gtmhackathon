# RSS Engine Spec — Date Category: Trending Signals

## Category definition

Trending signals are items from the last 30 days that show repeated language, recurring pain, or source clustering around the same GTM theme.

## Goal

Detect emerging market conversations before they become saturated.

## Date window

```ts
const TRENDING_WINDOW_DAYS = 30;
```

## Query examples

```text
"AI slop" newsletter
"AI generated" "cold email"
"inbox" "AI outreach"
"founders" "generic outreach"
"investors" "AI-generated pitches"
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
  "query": "recurring complaints about AI-generated sales outreach and inbox noise",
  "numResults": 50,
  "startPublishedDate": "{{now_minus_30_days}}",
  "contents": {
    "text": true,
    "highlights": true,
    "summary": true
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
  "query": "AI slop cold outreach founders investors newsletters blogs reddit",
  "search_depth": "advanced",
  "max_results": 50,
  "days": 30,
  "include_answer": false,
  "include_raw_content": true
}
```

## Internal endpoint

```http
POST /api/queries/date-window
Content-Type: application/json
```

```json
{
  "dateCategory": "trending",
  "windowDays": 30,
  "queries": [
    "AI slop cold outreach",
    "AI-generated pitches investor frustration",
    "generic AI sales emails"
  ],
  "platformHints": ["substack", "reddit", "hackernews", "blog"],
  "maxSourcesPerQuery": 50,
  "autoRegisterFeeds": true,
  "pollingIntervalMinutes": 180
}
```

## Trending calculation

```ts
interface TrendCluster {
  phrase: string;
  itemCount: number;
  uniqueSourceCount: number;
  averagePriorityScore: number;
  firstSeenAt: string;
  latestSeenAt: string;
}
```

```ts
trendScore =
  log(1 + itemCount) *
  log(1 + uniqueSourceCount) *
  averagePriorityScore *
  freshnessMultiplier;
```

## API endpoint for trends

```http
GET /api/signals/trends?windowDays=30&minSources=3&minScore=0.65
```

## Expected response

```json
{
  "windowDays": 30,
  "clusters": [
    {
      "phrase": "AI-generated cold outreach",
      "itemCount": 23,
      "uniqueSourceCount": 11,
      "averagePriorityScore": 0.78,
      "trendScore": 2.91
    }
  ]
}
```

## Polling rules

- Poll trending feeds every 3 hours.
- Promote feeds to recent monitoring if they produce high-priority items in the last 48 hours.
- Keep source clusters even if individual items are low-scoring; weak signals can matter in aggregate.

## Acceptance criteria

- Cursor should implement clustering by phrase, embedding similarity, and source overlap.
- Trend results must include representative items and source diversity.
- The system should avoid over-weighting one noisy source.

