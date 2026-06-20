import type {
  ContentItemInput,
  ContentMetricsInput,
  DiscoveryAgent,
  DiscoveryResult,
  NetRunContext,
  ProfileInput,
  RawCandidateInput,
} from "./types";

// --- Reddit discovery agent (keyless by default) ---
//
// Reads Reddit's PUBLIC .json endpoints, which need no app, OAuth, client
// id/secret, or redirect URI. Reddit only asks for a descriptive User-Agent
// and tolerates lower rate limits for unauthenticated access.
//
// If REDDIT_CLIENT_ID + REDDIT_CLIENT_SECRET are set, the agent upgrades to the
// OAuth host (oauth.reddit.com) for higher rate limits. With REDDIT_USERNAME +
// REDDIT_PASSWORD it uses the password grant, otherwise client_credentials.
//
// Both modes return the same JSON shape, so parsing is identical.

const OAUTH_BASE = "https://oauth.reddit.com";
const PUBLIC_BASE = "https://www.reddit.com";
const TOKEN_URL = "https://www.reddit.com/api/v1/access_token";
const DEFAULT_UA = "champion-discovery/0.1 (by /u/champion-discovery)";
const OAUTH_DELAY_MS = 1100; // ~60 req/min
const PUBLIC_DELAY_MS = 2500; // unauth public json is much stricter (~10-30/min)
const MAX_POSTS_PER_SUBREDDIT = 25;

type OptionalCreds = {
  clientId?: string;
  clientSecret?: string;
  username?: string;
  password?: string;
  userAgent: string;
};

function getCreds(): OptionalCreds {
  return {
    clientId: process.env.REDDIT_CLIENT_ID || undefined,
    clientSecret: process.env.REDDIT_CLIENT_SECRET || undefined,
    username: process.env.REDDIT_USERNAME || undefined,
    password: process.env.REDDIT_PASSWORD || undefined,
    userAgent: process.env.REDDIT_USER_AGENT || DEFAULT_UA,
  };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// A session captures whether we run authenticated (OAuth) or keyless (public),
// the request delay, and any bearer token.
type Session = {
  authenticated: boolean;
  token: string | null;
  userAgent: string;
  delayMs: number;
};

async function getAccessToken(creds: OptionalCreds): Promise<string> {
  const basic = Buffer.from(
    `${creds.clientId}:${creds.clientSecret}`
  ).toString("base64");

  const body = new URLSearchParams();
  if (creds.username && creds.password) {
    body.set("grant_type", "password");
    body.set("username", creds.username);
    body.set("password", creds.password);
  } else {
    body.set("grant_type", "client_credentials");
  }

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": creds.userAgent,
    },
    body,
  });

  if (!res.ok) {
    throw new Error(`Reddit auth failed (${res.status})`);
  }
  const json = (await res.json()) as { access_token?: string };
  if (!json.access_token) throw new Error("Reddit auth returned no token");
  return json.access_token;
}

async function createSession(): Promise<Session> {
  const creds = getCreds();
  // Keyless unless both client id and secret are configured.
  if (creds.clientId && creds.clientSecret) {
    const token = await getAccessToken(creds);
    return {
      authenticated: true,
      token,
      userAgent: creds.userAgent,
      delayMs: OAUTH_DELAY_MS,
    };
  }
  return {
    authenticated: false,
    token: null,
    userAgent: creds.userAgent,
    delayMs: PUBLIC_DELAY_MS,
  };
}

// Build a full URL for a given API path under the active session. For keyless
// mode the public host needs a `.json` suffix before the query string.
function buildUrl(session: Session, path: string): string {
  if (session.authenticated) {
    return `${OAUTH_BASE}${path}`;
  }
  const [pathname, query] = path.split("?");
  const suffixed = pathname.endsWith(".json") ? pathname : `${pathname}.json`;
  return `${PUBLIC_BASE}${suffixed}${query ? `?${query}` : ""}`;
}

async function apiGet(session: Session, path: string): Promise<unknown> {
  const headers: Record<string, string> = { "User-Agent": session.userAgent };
  if (session.authenticated && session.token) {
    headers.Authorization = `Bearer ${session.token}`;
  }
  const res = await fetch(buildUrl(session, path), { headers });
  if (res.status === 429) {
    throw new Error(
      "Reddit rate limit reached (429). Reduce subreddits or add REDDIT_CLIENT_ID/SECRET for higher limits."
    );
  }
  if (res.status === 403) {
    throw new Error(
      "Reddit returned 403 (blocked). Unauthenticated access may be throttled from this IP; set REDDIT_CLIENT_ID/SECRET."
    );
  }
  if (!res.ok) {
    throw new Error(`Reddit request ${path} failed (${res.status})`);
  }
  return res.json();
}

type RedditPost = {
  id: string;
  author: string;
  title: string;
  selftext: string;
  permalink: string;
  ups: number;
  num_comments: number;
  created_utc: number;
  subreddit: string;
  total_awards_received?: number;
};

type Listing = {
  data?: { children?: { kind: string; data: RedditPost }[] };
};

function postToContent(post: RedditPost): ContentItemInput {
  return {
    externalId: `t3_${post.id}`,
    type: "post",
    url: `https://www.reddit.com${post.permalink}`,
    title: post.title,
    body: post.selftext || post.title,
    authorHandle: `u/${post.author}`,
    publishedAt: new Date(post.created_utc * 1000),
    candidateExternalId: post.author,
    rawPayload: post as unknown as Record<string, unknown>,
    metrics: {
      likes: post.ups,
      comments: post.num_comments,
      shares: 0,
      views: 0,
      score: post.ups,
      extra: { awards: post.total_awards_received ?? 0 },
    },
  };
}

function getSubreddits(net: NetRunContext): string[] {
  const fromConfig = net.sourceConfig.subreddits;
  if (Array.isArray(fromConfig)) {
    return fromConfig.filter((s): s is string => typeof s === "string");
  }
  return [];
}

function getKeywords(net: NetRunContext): string {
  const kw = net.params.keywords;
  return typeof kw === "string" ? kw : "";
}

export const redditAgent: DiscoveryAgent = {
  sourceKey: "reddit",

  async run(net: NetRunContext): Promise<DiscoveryResult> {
    const session = await createSession();

    const subreddits = getSubreddits(net);
    if (subreddits.length === 0) {
      throw new Error(
        "No subreddits configured for Reddit source (set them on the source setup page)"
      );
    }
    const keywords = getKeywords(net);

    const candidatesByHandle = new Map<string, RawCandidateInput>();
    const content: ContentItemInput[] = [];

    for (const subreddit of subreddits) {
      const query = encodeURIComponent(keywords || "");
      const path = keywords
        ? `/r/${encodeURIComponent(subreddit)}/search?q=${query}&restrict_sr=1&sort=new&limit=${MAX_POSTS_PER_SUBREDDIT}`
        : `/r/${encodeURIComponent(subreddit)}/new?limit=${MAX_POSTS_PER_SUBREDDIT}`;

      const listing = (await apiGet(session, path)) as Listing;
      const children = listing.data?.children ?? [];

      for (const child of children) {
        if (child.kind !== "t3") continue;
        const post = child.data;
        if (!post.author || post.author === "[deleted]") continue;

        if (!candidatesByHandle.has(post.author)) {
          candidatesByHandle.set(post.author, {
            externalId: post.author,
            platformHandle: `u/${post.author}`,
            profileUrl: `https://www.reddit.com/user/${post.author}`,
            matchContext: post.title,
            rawPayload: { subreddit: post.subreddit, firstPostId: post.id },
          });
        }
        content.push(postToContent(post));
      }

      await sleep(session.delayMs);
    }

    // Pull lightweight profile snapshots (karma) for discovered authors.
    const profiles: ProfileInput[] = [];
    for (const handle of candidatesByHandle.keys()) {
      try {
        const about = (await apiGet(
          session,
          `/user/${encodeURIComponent(handle)}/about`
        )) as { data?: { link_karma?: number; comment_karma?: number } };
        const linkKarma = about.data?.link_karma ?? 0;
        const commentKarma = about.data?.comment_karma ?? 0;
        profiles.push({
          handle: `u/${handle}`,
          externalId: handle,
          followers: 0,
          posts: 0,
          audienceQuality: { linkKarma, commentKarma },
        });
        await sleep(session.delayMs);
      } catch {
        // Non-fatal: skip profile if the about endpoint fails.
      }
    }

    return {
      candidates: Array.from(candidatesByHandle.values()),
      content,
      profiles,
    };
  },

  async fetchContent(handle: string): Promise<ContentItemInput[]> {
    const session = await createSession();
    const username = handle.replace(/^u\//, "");
    const listing = (await apiGet(
      session,
      `/user/${encodeURIComponent(username)}/submitted?limit=${MAX_POSTS_PER_SUBREDDIT}`
    )) as Listing;
    const children = listing.data?.children ?? [];
    return children
      .filter((c) => c.kind === "t3")
      .map((c) => postToContent(c.data));
  },

  async fetchMetrics(externalId: string): Promise<ContentMetricsInput | null> {
    const session = await createSession();
    const id = externalId.startsWith("t3_") ? externalId : `t3_${externalId}`;
    const listing = (await apiGet(
      session,
      `/api/info?id=${encodeURIComponent(id)}`
    )) as Listing;
    const post = listing.data?.children?.[0]?.data;
    if (!post) return null;
    return {
      likes: post.ups,
      comments: post.num_comments,
      shares: 0,
      views: 0,
      score: post.ups,
      extra: { awards: post.total_awards_received ?? 0 },
    };
  },
};
