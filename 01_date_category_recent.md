# RSS Engine Spec — Date Category: Recent Signals

## Category definition

Recent signals are items published in the last 7 days. These are used for time-sensitive outreach, active pain detection, and identifying currently engaged prospects.

## Goal

Continuously monitor feeds and surface fresh GTM-relevant content quickly.

## Date window

```ts
const RECENT_WINDOW_DAYS = 7;
```

## Query examples

```text
"AI slop" outbound
"generic AI emails"
"cold outreach" "AI"
"founder-led sales" "inbox"
"VC" "AI-generated pitch"
"recruiter" "AI-generated applications"
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
  "query": "founders complaining about AI-generated cold outreach",
  "numResults": 20,
  "startPublishedDate": "{{now_minus_7_days}}",
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
  "query": "site:substack.com OR site:reddit.com AI generated outreach frustration",
  "topic": "general",
  "search_depth": "advanced",
  "max_results": 20,
  "days": 7,
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
  "dateCategory": "recent",
  "windowDays": 7,
  "queries": [
    "AI slop outbound",
    "generic AI cold email",
    "founder-led sales inbox noise"
  ],
  "platformHints": ["substack", "reddit", "blog"],
  "maxSourcesPerQuery": 20,
  "autoRegisterFeeds": true,
  "pollingIntervalMinutes": 60
}
```

## Expected response

```json
{
  "dateCategory": "recent",
  "registeredFeeds": 14,
  "candidateFeeds": 21,
  "rejectedCandidates": 7,
  "nextPollAt": "2026-06-20T15:00:00Z"
}
```

## Feed polling rules

- Poll every 60 minutes.
- Ignore items older than 7 days unless they are newly discovered and high authority.
- If a feed repeatedly returns no recent items for 14 days, downgrade polling interval to 360 minutes.
- If a feed produces 3+ high-scoring signals in 7 days, upgrade to 30-minute polling.

## Scoring boost

Recent items receive a freshness multiplier:

```ts
function freshnessMultiplier(ageHours: number): number {
  if (ageHours <= 24) return 1.25;
  if (ageHours <= 72) return 1.15;
  if (ageHours <= 168) return 1.05;
  return 1.0;
}
```

## Acceptance criteria

- Cursor should implement this category as a configurable date-window query profile.
- Items outside the recent window should not be discarded globally; they should be stored but excluded from recent-signal views.
- The API must return both registered feeds and rejected candidates with rejection reasons.

