import type {
  ContentItemInput,
  ContentMetricsInput,
  DiscoveryAgent,
  DiscoveryResult,
  NetRunContext,
  ProfileInput,
  RawCandidateInput,
} from "./types";

// --- X (Twitter) discovery agent ---
//
// Gated by API tier: requires X_BEARER_TOKEN (App-only OAuth 2.0). The free
// tier does NOT grant tweet search, so this agent throws a clear, actionable
// error unless a Basic+ tier bearer token is configured. Engagement comes from
// tweet `public_metrics`.
//
// Rate limits vary by tier; we cap result volume and avoid per-tweet calls.

const API_BASE = "https://api.twitter.com/2";
const MAX_RESULTS = 25;

function getBearer(): string {
  const token = process.env.X_BEARER_TOKEN;
  if (!token) {
    throw new Error(
      "X is gated by API tier: set X_BEARER_TOKEN (Basic tier or higher) to enable search"
    );
  }
  return token;
}

async function apiGet(
  path: string,
  token: string
): Promise<Record<string, unknown>> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 403) {
    throw new Error(
      "X API returned 403: your access tier does not permit this endpoint"
    );
  }
  if (res.status === 429) {
    throw new Error("X API rate limit reached (429). Try again later.");
  }
  if (!res.ok) {
    throw new Error(`X API ${path} failed (${res.status})`);
  }
  return (await res.json()) as Record<string, unknown>;
}

type XTweet = {
  id: string;
  text: string;
  author_id: string;
  created_at?: string;
  lang?: string;
  public_metrics?: {
    like_count: number;
    reply_count: number;
    retweet_count: number;
    impression_count?: number;
    quote_count?: number;
  };
};

type XUser = {
  id: string;
  username: string;
  name?: string;
  public_metrics?: {
    followers_count: number;
    following_count: number;
    tweet_count: number;
  };
};

function metricsOf(tweet: XTweet): ContentMetricsInput {
  const pm = tweet.public_metrics;
  return {
    likes: pm?.like_count ?? 0,
    comments: pm?.reply_count ?? 0,
    shares: (pm?.retweet_count ?? 0) + (pm?.quote_count ?? 0),
    views: pm?.impression_count ?? 0,
    extra: { quotes: pm?.quote_count ?? 0 },
  };
}

function buildQuery(net: NetRunContext): string {
  const keywords =
    typeof net.params.keywords === "string" ? net.params.keywords : "";
  const handles = net.sourceConfig.handles;
  const handleList = Array.isArray(handles)
    ? handles.filter((h): h is string => typeof h === "string")
    : [];

  const parts: string[] = [];
  if (keywords.trim()) {
    // Treat comma-separated keywords as OR terms.
    const terms = keywords
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    if (terms.length > 0) parts.push(`(${terms.join(" OR ")})`);
  }
  if (handleList.length > 0) {
    parts.push(`(${handleList.map((h) => `from:${h.replace(/^@/, "")}`).join(" OR ")})`);
  }
  parts.push("-is:retweet");
  return parts.join(" ");
}

export const xAgent: DiscoveryAgent = {
  sourceKey: "x",

  async run(net: NetRunContext): Promise<DiscoveryResult> {
    const token = getBearer();
    const query = buildQuery(net);

    const search = await apiGet(
      `/tweets/search/recent?query=${encodeURIComponent(query)}` +
        `&max_results=${MAX_RESULTS}` +
        `&tweet.fields=created_at,lang,public_metrics,author_id` +
        `&expansions=author_id` +
        `&user.fields=username,name,public_metrics`,
      token
    );

    const tweets = (search.data as XTweet[]) ?? [];
    const users = ((search.includes as { users?: XUser[] })?.users ?? []) as XUser[];
    const userById = new Map(users.map((u) => [u.id, u]));

    const candidates: RawCandidateInput[] = [];
    const content: ContentItemInput[] = [];
    const profiles: ProfileInput[] = [];

    for (const user of users) {
      candidates.push({
        externalId: user.id,
        platformHandle: `@${user.username}`,
        profileUrl: `https://x.com/${user.username}`,
        matchContext: user.name,
        rawPayload: user as unknown as Record<string, unknown>,
      });
      profiles.push({
        handle: `@${user.username}`,
        externalId: user.id,
        followers: user.public_metrics?.followers_count ?? 0,
        following: user.public_metrics?.following_count ?? 0,
        posts: user.public_metrics?.tweet_count ?? 0,
      });
    }

    for (const tweet of tweets) {
      const author = userById.get(tweet.author_id);
      content.push({
        externalId: tweet.id,
        type: "tweet",
        url: author
          ? `https://x.com/${author.username}/status/${tweet.id}`
          : `https://x.com/i/status/${tweet.id}`,
        body: tweet.text,
        authorHandle: author ? `@${author.username}` : undefined,
        lang: tweet.lang,
        publishedAt: tweet.created_at,
        candidateExternalId: tweet.author_id,
        rawPayload: tweet as unknown as Record<string, unknown>,
        metrics: metricsOf(tweet),
      });
    }

    return { candidates, content, profiles };
  },

  async fetchContent(handle: string): Promise<ContentItemInput[]> {
    const token = getBearer();
    const username = handle.replace(/^@/, "");
    const userRes = await apiGet(
      `/users/by/username/${encodeURIComponent(username)}?user.fields=username`,
      token
    );
    const user = userRes.data as XUser | undefined;
    if (!user) return [];

    const tweetsRes = await apiGet(
      `/users/${user.id}/tweets?max_results=${MAX_RESULTS}` +
        `&tweet.fields=created_at,lang,public_metrics`,
      token
    );
    const tweets = (tweetsRes.data as XTweet[]) ?? [];
    return tweets.map((tweet) => ({
      externalId: tweet.id,
      type: "tweet" as const,
      url: `https://x.com/${user.username}/status/${tweet.id}`,
      body: tweet.text,
      authorHandle: `@${user.username}`,
      lang: tweet.lang,
      publishedAt: tweet.created_at,
      candidateExternalId: user.id,
      metrics: metricsOf(tweet),
    }));
  },

  async fetchMetrics(externalId: string): Promise<ContentMetricsInput | null> {
    const token = getBearer();
    const res = await apiGet(
      `/tweets/${encodeURIComponent(externalId)}?tweet.fields=public_metrics`,
      token
    );
    const tweet = res.data as XTweet | undefined;
    return tweet ? metricsOf(tweet) : null;
  },
};
