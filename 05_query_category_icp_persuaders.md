# RSS Engine Spec — Query Category: ICP Persuaders

## Category definition

Persuaders are people who need others to take action: founders, sales leaders, recruiters, growth teams, fundraisers, community builders, and operators doing outbound or narrative work.

## Goal

Find RSS sources and items where persuaders discuss messaging, outreach, conversion, credibility, or trust problems.

## Query examples

```text
founder-led sales cold outreach AI
startup founder outbound not working
recruiters AI applications screening
fundraising cold email investor inbox
sales leader AI email deliverability
```

## Discovery endpoint

```http
POST /api/discovery/search
Content-Type: application/json
```

```json
{
  "queryCategory": "icp_persuaders",
  "queries": [
    "startup founders struggling with outbound sales emails",
    "founder-led sales AI outreach trust problem",
    "recruiters frustrated by AI generated applications",
    "fundraising cold email investor inbox noise"
  ],
  "providers": ["exa", "tavily"],
  "platformHints": ["substack", "reddit", "hackernews", "blog"],
  "dateWindowDays": 90,
  "maxResultsPerProvider": 50
}
```

## ICP classification

```ts
interface IcpClassification {
  category: 'persuader';
  role: 'founder' | 'sales_leader' | 'recruiter' | 'growth_operator' | 'fundraiser' | 'unknown';
  confidence: number;
  evidence: string[];
}
```

## Persuader score

```ts
persuaderFitScore =
  roleFitScore * 0.30 +
  messagingPainScore * 0.25 +
  commercialUrgencyScore * 0.20 +
  reachableSourceScore * 0.15 +
  recencyScore * 0.10;
```

## Internal endpoint

```http
GET /api/signals?icpCategory=persuader&minPriorityScore=0.65&limit=50
```

## Feed registration policy

Auto-register feed if:

- Source has RSS/Atom or RSSHub/RSS-Bridge route.
- At least one item has `persuaderFitScore >= 0.7`.
- Source is not blocked by robots, auth wall, or paywall-only content.

Manual review if:

- Feed source is high authority but low item volume.
- Content is partially gated.
- Source quality is unclear.

## Acceptance criteria

- System must identify persuader role and supporting evidence.
- Feed-level and item-level scoring should be separate.
- Cursor should implement this as a reusable query profile, not hardcoded logic.

