import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const reddit = await prisma.source.upsert({
    where: { key: "reddit" },
    update: {},
    create: {
      key: "reddit",
      label: "Reddit",
      enabled: false,
      config: { subreddits: ["startups", "SaaS"] },
    },
  });

  const x = await prisma.source.upsert({
    where: { key: "x" },
    update: {},
    create: {
      key: "x",
      label: "X (Twitter)",
      enabled: false,
      config: { handles: [] },
    },
  });

  const linkedin = await prisma.source.upsert({
    where: { key: "linkedin" },
    update: {},
    create: {
      key: "linkedin",
      label: "LinkedIn",
      enabled: false,
      config: { industries: ["software"] },
    },
  });

  const netFounders = await prisma.net.upsert({
    where: { id: "seed-net-founders" },
    update: { icpTarget: "persuader" },
    create: {
      id: "seed-net-founders",
      name: "Early-stage founders",
      description: "People discussing fundraising and product launches",
      icpTarget: "persuader",
      params: {
        keywords: "seed round, founder, launched",
        minFollowers: "500",
      },
      isActive: true,
      sources: {
        create: [{ sourceId: reddit.id }, { sourceId: x.id }],
      },
    },
  });

  const netDevTools = await prisma.net.upsert({
    where: { id: "seed-net-devtools" },
    update: { icpTarget: "either" },
    create: {
      id: "seed-net-devtools",
      name: "DevTools advocates",
      description: "Active voices in developer tooling communities",
      icpTarget: "either",
      params: {
        keywords: "developer tools, API, SDK",
        region: "US",
      },
      isActive: true,
      sources: {
        create: [{ sourceId: linkedin.id }],
      },
    },
  });

  const netEvaluators = await prisma.net.upsert({
    where: { id: "seed-net-evaluators" },
    update: { icpTarget: "evaluator" },
    create: {
      id: "seed-net-evaluators",
      name: "Investors & gatekeepers",
      description: "People who evaluate high-volume inbound for signal",
      icpTarget: "evaluator",
      params: {
        keywords: "founder pitch, deal flow, AI slop, signal",
      },
      isActive: true,
      sources: {
        create: [{ sourceId: x.id }, { sourceId: linkedin.id }],
      },
    },
  });

  // Clean previously-seeded derived data (order matters for FKs).
  const seedCandidateIds = [
    "seed-candidate-1",
    "seed-candidate-2",
    "seed-candidate-3",
    "seed-candidate-4",
    "seed-candidate-5",
  ];
  const seedContentIds = [
    "seed-content-1",
    "seed-content-2",
    "seed-content-3",
    "seed-content-4",
    "seed-content-5",
  ];

  await prisma.contentMetricSnapshot.deleteMany({
    where: { contentItemId: { in: seedContentIds } },
  });
  await prisma.signalEvidence.deleteMany({
    where: { contentItemId: { in: seedContentIds } },
  });
  await prisma.contentItem.deleteMany({ where: { id: { in: seedContentIds } } });
  await prisma.rawCandidate.deleteMany({
    where: { id: { in: seedCandidateIds } },
  });
  await prisma.profileSnapshot.deleteMany({
    where: { handle: { in: ["@sarahbuilds", "u/startup_sarah"] } },
  });

  const candidates: {
    id: string;
    sourceId: string;
    netId: string;
    externalId: string;
    platformHandle: string;
    profileUrl: string;
    matchContext: string;
    rawPayload: Record<string, unknown>;
  }[] = [
    {
      id: "seed-candidate-1",
      sourceId: reddit.id,
      netId: netFounders.id,
      externalId: "reddit-u123",
      platformHandle: "u/startup_sarah",
      profileUrl: "https://reddit.com/u/startup_sarah",
      matchContext: "Just closed our seed round and shipping v1 next week…",
      rawPayload: { subreddit: "startups", postId: "abc123", score: 42 },
    },
    {
      id: "seed-candidate-2",
      sourceId: x.id,
      netId: netFounders.id,
      externalId: "x-987654",
      platformHandle: "@sarahbuilds",
      profileUrl: "https://x.com/sarahbuilds",
      matchContext: "Founder building in public — day 90 of our launch journey",
      rawPayload: { tweetId: "987654", followers: 1200 },
    },
    {
      id: "seed-candidate-3",
      sourceId: linkedin.id,
      netId: netDevTools.id,
      externalId: "linkedin-in-555",
      platformHandle: "alex-chen-dev",
      profileUrl: "https://linkedin.com/in/alex-chen-dev",
      matchContext: "Passionate about developer experience and API design",
      rawPayload: { headline: "Staff Engineer @ DevCo", connections: 800 },
    },
    {
      id: "seed-candidate-4",
      sourceId: reddit.id,
      netId: netDevTools.id,
      externalId: "reddit-u456",
      platformHandle: "u/api_enthusiast",
      profileUrl: "https://reddit.com/u/api_enthusiast",
      matchContext: "Best SDK docs I've seen this year — here's why…",
      rawPayload: { subreddit: "programming", commentId: "def456" },
    },
    {
      id: "seed-candidate-5",
      sourceId: x.id,
      netId: netEvaluators.id,
      externalId: "x-111222",
      platformHandle: "@vc_taste",
      profileUrl: "https://x.com/vc_taste",
      matchContext: "Every founder pitch sounds the same now — AI slop everywhere",
      rawPayload: { tweetId: "111222", followers: 18400 },
    },
  ];

  for (const candidate of candidates) {
    const { rawPayload, ...rest } = candidate;
    await prisma.rawCandidate.create({
      data: {
        ...rest,
        dedupeStatus: "unresolved",
        rawPayload: rawPayload as Prisma.InputJsonValue,
      },
    });
  }

  // Sample content (full text for in-app reading) with engagement metrics.
  const contentSeed: {
    id: string;
    sourceId: string;
    rawCandidateId: string;
    externalId: string;
    type: string;
    url: string;
    title: string | null;
    authorHandle: string;
    body: string;
    publishedAt: Date;
    metrics: { likes: number; comments: number; shares: number; views: number; score?: number };
  }[] = [
    {
      id: "seed-content-1",
      sourceId: reddit.id,
      rawCandidateId: "seed-candidate-1",
      externalId: "reddit-post-abc123",
      type: "post",
      url: "https://reddit.com/r/startups/comments/abc123",
      title: "Just closed our seed round",
      authorHandle: "u/startup_sarah",
      body: "Just closed our seed round and shipping v1 next week. I keep rewriting investor updates because the ChatGPT voice doesn't sound like me. I need to follow up with our angels without sounding like a sequence. Founder-led sales is all about authenticity and human connection.",
      publishedAt: new Date("2026-05-01T10:00:00Z"),
      metrics: { likes: 42, comments: 12, shares: 3, views: 1500, score: 42 },
    },
    {
      id: "seed-content-2",
      sourceId: x.id,
      rawCandidateId: "seed-candidate-2",
      externalId: "x-tweet-987654",
      type: "tweet",
      url: "https://x.com/sarahbuilds/status/987654",
      title: null,
      authorHandle: "@sarahbuilds",
      body: "Building in public, day 90. Everyone's outbound sounds the same now — generic AI writing everywhere. I want to preserve my voice and writing style while scaling founder-led sales. Personal brand matters.",
      publishedAt: new Date("2026-05-10T14:30:00Z"),
      metrics: { likes: 320, comments: 45, shares: 60, views: 22000 },
    },
    {
      id: "seed-content-3",
      sourceId: linkedin.id,
      rawCandidateId: "seed-candidate-3",
      externalId: "linkedin-post-555",
      type: "article",
      url: "https://linkedin.com/posts/alex-chen-dev-555",
      title: "Why developer experience is a moat",
      authorHandle: "alex-chen-dev",
      body: "Thoughts on API design and developer experience. We use Clay, Apollo, and Notion AI in our workflow. Good SDK docs are underrated. Relationship-led growth beats spray and pray outbound every time.",
      publishedAt: new Date("2026-04-20T09:00:00Z"),
      metrics: { likes: 210, comments: 30, shares: 18, views: 9000 },
    },
    {
      id: "seed-content-4",
      sourceId: reddit.id,
      rawCandidateId: "seed-candidate-4",
      externalId: "reddit-comment-def456",
      type: "comment",
      url: "https://reddit.com/r/programming/comments/def456",
      title: null,
      authorHandle: "u/api_enthusiast",
      body: "Best SDK docs I've seen this year. Editing AI output takes forever — the AI draft still needs work every time. Prompting takes too long.",
      publishedAt: new Date("2026-05-15T18:45:00Z"),
      metrics: { likes: 88, comments: 7, shares: 1, views: 3200, score: 88 },
    },
    {
      id: "seed-content-5",
      sourceId: x.id,
      rawCandidateId: "seed-candidate-5",
      externalId: "x-tweet-111222",
      type: "thread",
      url: "https://x.com/vc_taste/status/111222",
      title: null,
      authorHandle: "@vc_taste",
      body: "Every founder pitch is starting to sound the same. AI slop has made cold inbound harder to judge. My inbox is full of pitches that look polished but say nothing. I need to find real signal in founder outreach — the quality bar matters and I protect who gets access to my network.",
      publishedAt: new Date("2026-06-01T12:00:00Z"),
      metrics: { likes: 1400, comments: 210, shares: 380, views: 145000 },
    },
  ];

  for (const item of contentSeed) {
    const { metrics, ...content } = item;
    await prisma.contentItem.create({ data: content });
    await prisma.contentMetricSnapshot.create({
      data: { contentItemId: item.id, ...metrics },
    });
  }

  // A couple of profile snapshots feeding Network Leverage.
  await prisma.profileSnapshot.create({
    data: {
      sourceId: x.id,
      handle: "@sarahbuilds",
      followers: 1200,
      following: 340,
      posts: 890,
    },
  });
  await prisma.profileSnapshot.create({
    data: {
      sourceId: reddit.id,
      handle: "u/startup_sarah",
      followers: 0,
      following: 0,
      posts: 120,
      audienceQuality: { karma: 5400 },
    },
  });

  console.log("Seed complete:", {
    sources: [reddit.key, x.key, linkedin.key],
    nets: [netFounders.name, netDevTools.name, netEvaluators.name],
    candidates: candidates.length,
    content: contentSeed.length,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
