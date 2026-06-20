# RSS Engine Spec — Query Category: Pain Signals

## Category definition

Pain-signal queries identify users expressing frustration, saturation, failure, inefficiency, or distrust around AI-generated communication and GTM workflows.

## Goal

Find high-signal content where someone states or implies a problem Lightfern can solve.

## Target language patterns

```text
"AI slop"
"generic outreach"
"cold email fatigue"
"my inbox is full of AI"
"AI-generated pitches"
"low quality outreach"
"automated spam"
"hard to tell what is real"
"every pitch sounds the same"
"inbound quality is down"
"signal to noise"
```

## Discovery endpoint

```http
POST /api/discovery/search
Content-Type: application/json
```

```json
{
  "queryCategory": "pain_signals",
  "queries": [
    "AI slop cold outreach",
    "generic AI-generated sales email frustration",
    "investors complaining about AI-generated startup pitches",
    "founders frustrated by low quality AI outbound"
  ],
  "providers": ["exa", "tavily"],
  "platformHints": ["substack", "reddit", "blog"],
  "dateWindowDays": 30,
  "maxResultsPerProvider": 25
}
```

## Feed resolution endpoint

```http
POST /api/discovery/resolve-feed
Content-Type: application/json
```

```json
{
  "url": "https://example.substack.com/p/some-post",
  "platformHint": "substack",
  "strategy": "native_then_rsshub_then_rssbridge"
}
```

## Expected feed resolution response

```json
{
  "resolved": true,
  "candidates": [
    {
      "sourceType": "native_rss",
      "feedUrl": "https://example.substack.com/feed",
      "confidence": 0.95
    }
  ]
}
```

## Scoring model

```ts
painSignalScore =
  explicitFrustrationScore * 0.35 +
  problemSpecificityScore * 0.25 +
  recencyScore * 0.15 +
  audienceFitScore * 0.15 +
  actionabilityScore * 0.10;
```

## AI-slop frustration classifier

```ts
interface AiSlopFrustrationResult {
  score: number; // 0..1
  matchedPhrases: string[];
  sentiment: 'negative' | 'neutral' | 'positive';
  frustrationType: 'inbox_noise' | 'generic_content' | 'trust_decay' | 'screening_burden' | 'unknown';
}
```

## Internal signal endpoint

```http
GET /api/signals?queryCategory=pain_signals&minPainScore=0.65&minAiSlopScore=0.5
```

## Acceptance criteria

- Pain-signal queries must return both raw items and scored signal records.
- Scoring rationale must include phrase matches and model-derived explanation.
- Duplicate posts from the same canonical URL must collapse into one signal.
- Reddit/Substack/blog content must share the same canonical schema.

