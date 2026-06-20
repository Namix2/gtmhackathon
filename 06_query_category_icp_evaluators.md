# RSS Engine Spec — Query Category: ICP Evaluators

## Category definition

Evaluators are people who receive, assess, filter, or judge messages: investors, buyers, hiring managers, analysts, journalists, community moderators, and decision-makers.

## Goal

Find RSS sources and content where evaluators complain about signal-to-noise, AI-generated messages, spam, shallow personalisation, or screening burden.

## Query examples

```text
investors AI-generated pitches inbox
buyers generic AI sales emails
hiring managers AI-generated applications
journalists PR pitch spam AI
VC signal to noise startup pitches
```

## Discovery endpoint

```http
POST /api/discovery/search
Content-Type: application/json
```

```json
{
  "queryCategory": "icp_evaluators",
  "queries": [
    "investors complaining about AI-generated startup pitches",
    "buyers frustrated by generic AI sales emails",
    "hiring managers overwhelmed by AI-generated applications",
    "journalists complaining about AI PR pitch spam"
  ],
  "providers": ["exa", "tavily"],
  "platformHints": ["substack", "reddit", "blog", "news"],
  "dateWindowDays": 90,
  "maxResultsPerProvider": 50
}
```

## ICP classification

```ts
interface IcpClassification {
  category: 'evaluator';
  role: 'investor' | 'buyer' | 'hiring_manager' | 'journalist' | 'moderator' | 'unknown';
  confidence: number;
  evidence: string[];
}
```

## Evaluator score

```ts
evaluatorFitScore =
  roleAuthorityScore * 0.30 +
  screeningBurdenScore * 0.25 +
  signalNoiseScore * 0.20 +
  publicVisibilityScore * 0.15 +
  recencyScore * 0.10;
```

## Internal endpoint

```http
GET /api/signals?icpCategory=evaluator&minAiSlopScore=0.5&minPriorityScore=0.65&limit=50
```

## Feed registration policy

Auto-register feed if:

- Feed owner or community is likely to contain evaluators.
- Recent content includes signal-to-noise or AI-generated-message pain.
- Feed has stable polling reliability.

Manual review if:

- Content is mostly commentary with low commercial relevance.
- Source is influential but sparse.
- Feed contains mixed roles that require classification.

## Acceptance criteria

- System must distinguish between evaluator pain and generic AI criticism.
- Evaluator score should boost authority and visibility.
- Items should be usable for GTM research without direct outreach if the source is sensitive.

