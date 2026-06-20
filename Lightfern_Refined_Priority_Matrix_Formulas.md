# Lightfern Refined Priority Matrix Formulas

## Purpose

Lightfern should identify prospects who are not merely potential users, but potential champions.

The scoring model therefore needs to answer three questions:

1. **Can this person use Lightfern meaningfully?**
2. **Can this person spread Lightfern through authority, network, or public voice?**
3. **Has this person already shown frustration with AI-generated generic communication?**

The model should be suitable for a Unify GTM enrichment workflow, meaning each score should be inferable from public, enriched, or semi-structured data.

---

# Model Overview

## Three-Part Scoring System

```text
Adjusted Priority Score = Base Priority Score × AI-Slop-Frustration Coefficient
```

Where:

```text
Base Priority Score =
(0.55 × Champion Fit Score)
+ (0.45 × ICP Use-Case Score)
```

And:

```text
AI-Slop-Frustration Coefficient = 1.00 + min(0.30, Weighted Frustration Score)
```

The coefficient is capped at **1.30** so frustration can re-rank strong prospects without overpowering poor fit.

---

# Stage 1: Champion Fit Score

## Formula

```text
Champion Fit Score =
(0.30 × Network Leverage)
+ (0.25 × Public Voice / Taste Signal)
+ (0.20 × Mission Alignment)
+ (0.15 × Workflow Relevance)
+ (0.10 × Tool Adoption Propensity)
```

Score each parameter from **0 to 10**.

## 1. Network Leverage — 30%

Measures whether adoption by this person could influence others.

**Observable signals**

- Large engaged LinkedIn/X audience.
- Newsletter, Substack, blog, podcast, YouTube, or community.
- Speaking at events.
- VC, accelerator, founder community, or operator network.
- Senior executive or team leader.
- Frequent public recommendations of tools, people, or workflows.

**High score**

A visible founder, VC, GTM leader, operator, or community owner with an engaged audience.

---

## 2. Public Voice / Taste Signal — 25%

Measures whether the person has a recognisable voice worth preserving.

**Observable signals**

- Writes in first person.
- Publishes essays, newsletters, posts, memos, or long-form reflections.
- Uses distinctive language, strong opinions, or repeated themes.
- Discusses taste, judgement, craft, clarity, specificity, writing, or communication quality.
- Receives comments indicating that people value their point of view.

**High score**

Someone whose public writing is a meaningful part of their professional identity.

---

## 3. Mission Alignment — 20%

Measures alignment with Lightfern’s mission around human intent, human connection, and human taste.

**Observable signals**

- Critiques generic AI content, AI slop, bad outbound, or fake personalisation.
- Values human connection, trust, judgement, taste, or careful communication.
- Talks about relationship-led growth, founder-led sales, thoughtful networking, or quality communication.
- Shows concern about automation degrading trust.

**High score**

Someone who already articulates the worldview Lightfern wants to represent.

---

## 4. Workflow Relevance — 15%

Measures whether Lightfern can fit into the person’s daily or weekly communication workflow.

**Observable signals**

- High external email/message volume.
- Fundraising, sales, hiring, partnerships, investor updates, community management, or deal flow.
- Public evidence of relationship-heavy work.
- Role requires frequent follow-up, introductions, or stakeholder communication.

**High score**

A person whose role directly depends on high-stakes written communication.

---

## 5. Tool Adoption Propensity — 10%

Measures likelihood of trying a specialised AI writing/workflow tool.

**Observable signals**

- Mentions AI workflows, productivity tools, GTM tools, automation, or stack-building.
- Uses Clay, Apollo, HubSpot, Superhuman, Notion AI, ChatGPT, Claude, Instantly, Lemlist, Customer.io, or similar tools.
- Shares tool reviews, workflow experiments, or productivity setups.
- Works in a tool-forward role such as growth, GTM, startup operations, VC, or AI education.

**High score**

A tool-aware operator who experiments with specialised AI tools.

---

# Stage 2A: Persuader Use-Case Score

Use this formula for High-Stakes Persuaders.

## Formula

```text
Persuader Use-Case Score =
(0.35 × High-Stakes Outbound Intensity)
+ (0.25 × Relationship Sensitivity)
+ (0.20 × Commercial Urgency)
+ (0.20 × Need for Voice Preservation)
```

Score each parameter from **0 to 10**.

## 1. High-Stakes Outbound Intensity — 35%

Measures how much the prospect needs to send important messages.

**Signals**

- Founder-led sales.
- Fundraising.
- Enterprise sales.
- Senior hiring.
- Partnerships.
- Investor updates.
- Community or ecosystem outreach.

---

## 2. Relationship Sensitivity — 25%

Measures whether generic communication could damage trust.

**Signals**

- Communicates with investors, customers, senior candidates, partners, advisors, or community members.
- Maintains long-term professional relationships.
- Works in relationship-led growth, partnerships, executive search, or founder/operator networks.

---

## 3. Commercial Urgency — 20%

Measures whether better communication can immediately affect business outcomes.

**Signals**

- Fundraising event.
- Launch.
- Hiring push.
- New GTM motion.
- Sales growth target.
- New leadership role.
- Partnership programme.
- Accelerator/demo day context.

---

## 4. Need for Voice Preservation — 20%

Measures whether the person’s personal voice matters to outcomes.

**Signals**

- Visible founder brand.
- Public writing.
- Newsletter or essays.
- Distinct tone.
- Regular first-person communication.
- Audience expects personal perspective rather than corporate copy.

---

# Stage 2B: Evaluator Use-Case Score

Use this formula for High-Signal Evaluators.

## Formula

```text
Evaluator Use-Case Score =
(0.35 × Inbound Volume)
+ (0.25 × Signal-Filtering Responsibility)
+ (0.20 × Curation Authority)
+ (0.20 × Exposure to AI-Generated Noise)
```

Score each parameter from **0 to 10**.

## 1. Inbound Volume — 35%

Measures how much inbound communication the person likely receives.

**Signals**

- Public email or open DMs.
- VC/investor role.
- Journalist or analyst role.
- Accelerator admissions.
- Community applications.
- Executive buyer receiving vendor outreach.

---

## 2. Signal-Filtering Responsibility — 25%

Measures whether evaluating inbound is central to their role.

**Signals**

- Reviews founder pitches.
- Reviews applications.
- Reviews candidates.
- Reviews vendor pitches.
- Selects cohort members, community members, guests, speakers, or contributors.

---

## 3. Curation Authority — 20%

Measures whether the person controls access to an audience, capital, network, or opportunity.

**Signals**

- VC portfolio.
- Accelerator cohort.
- Newsletter audience.
- Community ownership.
- Event stage.
- Podcast guest selection.
- Analyst coverage.

---

## 4. Exposure to AI-Generated Noise — 20%

Measures how likely the person is to receive generic AI-written pitches or requests.

**Signals**

- Publicly contactable.
- Receives founder pitches, PR pitches, vendor outreach, applications, or cold DMs.
- Posts about inbox overload, bad outreach, AI spam, or generic pitches.

---

# Stage 3A: Persuader AI-Slop-Frustration Coefficient

## Formula

```text
Persuader AI-Slop-Frustration Coefficient =
1.00
+ (0.08 × AI Voice Anxiety)
+ (0.07 × Generic Outreach Frustration)
+ (0.06 × Authenticity / Personal Brand Concern)
+ (0.05 × Editing Burden)
+ (0.04 × Relationship Quality Concern)
```

Each sub-signal is scored as:

| Score | Meaning |
|---:|---|
| 0 | No evidence |
| 0.5 | Weak or indirect evidence |
| 1 | Clear direct evidence |

Maximum coefficient: **1.30**.

## Sub-Signals

### AI Voice Anxiety — 0.08

Evidence that the person worries about sounding robotic, synthetic, generic, or unlike themselves.

**Search phrases**

- “AI doesn’t sound like me”
- “ChatGPT voice”
- “generic AI writing”
- “sounds robotic”
- “AI-generated voice”

### Generic Outreach Frustration — 0.07

Evidence that the person dislikes mass personalisation, bad outbound, or generic sales messages.

**Search phrases**

- “bad outbound”
- “generic sales email”
- “personalisation at scale”
- “cold email is broken”
- “AI sales emails”
- “spray and pray”

### Authenticity / Personal Brand Concern — 0.06

Evidence that the person values authenticity, voice, style, or personal brand.

**Search phrases**

- “authenticity”
- “personal brand”
- “voice”
- “writing style”
- “taste”
- “human connection”

### Editing Burden — 0.05

Evidence that AI drafts require heavy rewriting.

**Search phrases**

- “rewrite ChatGPT”
- “editing AI output”
- “AI draft still needs work”
- “prompting takes too long”
- “AI writing needs editing”

### Relationship Quality Concern — 0.04

Evidence that the person cares about communication as a relationship-building mechanism.

**Search phrases**

- “relationship-led growth”
- “warm intros”
- “staying in touch”
- “relationship building”
- “trust at scale”
- “community-led growth”

---

# Stage 3B: Evaluator AI-Slop-Frustration Coefficient

## Formula

```text
Evaluator AI-Slop-Frustration Coefficient =
1.00
+ (0.08 × Inbound Noise Frustration)
+ (0.07 × Signal Detection Anxiety)
+ (0.06 × AI-Slop Discourse Engagement)
+ (0.05 × Generic Pitch Frustration)
+ (0.04 × Curation / Gatekeeping Concern)
```

Each sub-signal is scored as:

| Score | Meaning |
|---:|---|
| 0 | No evidence |
| 0.5 | Weak or indirect evidence |
| 1 | Clear direct evidence |

Maximum coefficient: **1.30**.

## Sub-Signals

### Inbound Noise Frustration — 0.08

Evidence that the person complains about too much inbound communication.

**Search phrases**

- “inbox is full”
- “too many pitches”
- “cold emails”
- “DMs are full”
- “inbound overload”
- “vendor spam”

### Signal Detection Anxiety — 0.07

Evidence that the person cares about finding quality inside volume.

**Search phrases**

- “signal from noise”
- “high signal”
- “hard to find signal”
- “founder quality”
- “quality bar”
- “real insight”

### AI-Slop Discourse Engagement — 0.06

Evidence that the person explicitly discusses AI slop, generic AI content, or synthetic communication.

**Search phrases**

- “AI slop”
- “AI-generated noise”
- “everything sounds the same”
- “synthetic content”
- “AI spam”
- “LLM-generated”

### Generic Pitch Frustration — 0.05

Evidence that the person dislikes bland pitches, fake personalisation, or empty claims.

**Search phrases**

- “bad pitch”
- “generic pitch”
- “founder pitch”
- “PR pitch”
- “vendor pitch”
- “fake personalisation”

### Curation / Gatekeeping Concern — 0.04

Evidence that the person protects access to a network, audience, portfolio, or community.

**Search phrases**

- “curation”
- “quality control”
- “community quality”
- “membership quality”
- “protect the network”
- “who gets access”

---

# Final Priority Bands

| Adjusted Priority Score | Priority Band | Action |
|---:|---|---|
| 10.0+ | Tier 1 | Immediate deeply personalised outreach |
| 8.5–9.9 | Tier 2 | High-quality outbound sequence with manual review |
| 7.0–8.4 | Tier 3 | Nurture, social engagement, newsletter, community touch |
| Below 7.0 | Tier 4 | Ignore unless strategically important |

---

# Recommended Ranking Logic

1. Classify the prospect as Persuader, Evaluator, or Hybrid.
2. Calculate Champion Fit Score.
3. Calculate ICP-specific Use-Case Score.
4. Calculate Base Priority Score.
5. Calculate ICP-specific AI-Slop-Frustration Coefficient.
6. Calculate Adjusted Priority Score.
7. Assign outreach tier.
8. Generate outreach angle based on the highest contributing signals.

---

# Hybrid Prospects

Some prospects are both Persuaders and Evaluators.

Examples:

- Founder-CEO with a large audience.
- VC who writes publicly and sends frequent founder/operator emails.
- Accelerator leader who both reviews applications and maintains founder relationships.
- Community operator who both curates access and sends high-touch communication.

For hybrid prospects:

```text
Persuader Adjusted Score = Persuader Base Score × Persuader Frustration Coefficient
```

```text
Evaluator Adjusted Score = Evaluator Base Score × Evaluator Frustration Coefficient
```

Then:

```text
Final Hybrid Priority Score = max(Persuader Adjusted Score, Evaluator Adjusted Score)
```

Also store:

```text
Dominant Buying Motivation = Persuader or Evaluator
```

Use the dominant motivation to personalise outreach.

---

# Why This Model Works for Lightfern

This model prioritises prospects who are:

1. Likely to use Lightfern regularly.
2. Likely to care about human voice and communication quality.
3. Likely to spread Lightfern through reputation or network effect.
4. Already aware of the AI-slop problem.
5. Detectable through public and enriched data sources.

The key principle is:

> Champion fit first. Use-case fit second. AI-slop frustration as the final re-ranker.
