import Parser from "rss-parser";
import type {
  ContentItemInput,
  ContentMetricsInput,
  DiscoveryAgent,
  DiscoveryResult,
  NetRunContext,
  ProfileInput,
  RawCandidateInput,
} from "./types";

// --- Generic RSS / Atom discovery agent (keyless) ---
//
// Reads any list of public feed URLs (Substack /feed, Medium, blogs, YouTube
// channel feeds, podcasts, Reddit .rss, etc). No API keys.
//
// Each *item* in a feed becomes a "find". We resolve the per-item author
// (dc:creator / <author> / Atom author, falling back to the publication) and
// group finds by author, so every candidate represents a person (or
// publication) plus everything we know about them: name, email, link, the
// publication they wrote in, post count, and which net keywords they matched.
// Feeds carry no engagement/follower numbers, so metrics are omitted and
// downstream scoring relies on signals + volume.

const FEED_DELAY_MS = 500;
const MAX_ITEMS_PER_FEED = 25;
const USER_AGENT =
  process.env.RSS_USER_AGENT || "champion-discovery/0.1 (+rss)";

const parser = new Parser({
  timeout: 15000,
  headers: { "User-Agent": USER_AGENT },
});

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type FeedItem = {
  title?: string;
  link?: string;
  guid?: string;
  isoDate?: string;
  pubDate?: string;
  creator?: string;
  author?: string;
  content?: string;
  contentSnippet?: string;
  "content:encoded"?: string;
  categories?: string[];
  comments?: string;
};

type FeedMeta = {
  title?: string;
  link?: string;
  description?: string;
  language?: string;
  managingEditor?: string;
  itunes?: { author?: string };
  image?: { url?: string };
};

type ResolvedAuthor = {
  name: string;
  email?: string;
  isPublication: boolean;
};

// Accept feed URLs with or without a scheme; rss-parser requires a protocol.
function normalizeFeedUrl(raw: string): string {
  const trimmed = raw.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed.replace(/^\/+/, "")}`;
}

function getFeeds(net: NetRunContext): string[] {
  const fromConfig = net.sourceConfig.feeds;
  if (Array.isArray(fromConfig)) {
    return fromConfig
      .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
      .map(normalizeFeedUrl);
  }
  return [];
}

function getKeywordTerms(net: NetRunContext): string[] {
  const kw = net.params.keywords;
  if (typeof kw !== "string") return [];
  return kw
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length > 0);
}

function matchKeywords(text: string, terms: string[]): string[] {
  if (terms.length === 0) return [];
  const haystack = text.toLowerCase();
  return terms.filter((t) => haystack.includes(t));
}

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "unknown"
  );
}

// Parse an RSS <author> / managingEditor value, which is conventionally
// "email@host.com (Display Name)" but is often just a name or just an email.
function parseAuthorString(raw?: string): { name?: string; email?: string } {
  if (!raw || typeof raw !== "string") return {};
  const value = raw.trim();
  if (!value) return {};

  const emailMatch = value.match(/([^\s<>()]+@[^\s<>()]+\.[^\s<>()]+)/);
  const email = emailMatch?.[1];

  const paren = value.match(/\(([^)]+)\)/);
  let name = paren?.[1]?.trim();
  if (!name) {
    const withoutEmail = (email ? value.replace(email, "") : value)
      .replace(/[<>]/g, "")
      .trim();
    name = withoutEmail || undefined;
  }
  if (name && email && name === email) name = undefined;

  return { name, email };
}

function resolveAuthor(item: FeedItem, feed: FeedMeta): ResolvedAuthor {
  const creator = item.creator?.trim();
  if (creator) return { name: creator, isPublication: false };

  const parsed = parseAuthorString(item.author);
  if (parsed.name || parsed.email) {
    return {
      name: parsed.name ?? parsed.email!,
      email: parsed.email,
      isPublication: false,
    };
  }

  // No per-item author: attribute the find to the publication itself.
  const itunesAuthor =
    typeof feed.itunes?.author === "string" ? feed.itunes.author.trim() : "";
  const editor = parseAuthorString(feed.managingEditor);
  const name = itunesAuthor || editor.name || feed.title?.trim() || "Unknown";
  return { name, email: editor.email, isPublication: true };
}

function authorKey(author: ResolvedAuthor, feedUrl: string): string {
  if (author.email) return `mailto:${author.email.toLowerCase()}`;
  if (author.isPublication) return `feed:${feedUrl}`;
  return `rss-author:${hostOf(feedUrl)}:${slugify(author.name)}`;
}

function itemBody(item: FeedItem): string {
  return (
    item.contentSnippet ||
    item["content:encoded"] ||
    item.content ||
    item.title ||
    ""
  );
}

function itemExternalId(feedUrl: string, item: FeedItem): string {
  return item.guid || item.link || `${feedUrl}#${item.title ?? Math.random()}`;
}

type AuthorGroup = {
  key: string;
  author: ResolvedAuthor;
  feedUrl: string;
  feed: FeedMeta;
  items: FeedItem[];
  matched: Set<string>;
  firstMatchTitle?: string;
};

async function readFeed(
  feedUrl: string,
  terms: string[]
): Promise<{
  candidates: RawCandidateInput[];
  content: ContentItemInput[];
  profiles: ProfileInput[];
}> {
  const parsed = await parser.parseURL(feedUrl);
  const feed = parsed as unknown as FeedMeta;
  const feedTitle = feed.title?.trim() || feedUrl;
  const feedLink = feed.link;
  const language = feed.language;

  const rawItems = (parsed.items ?? []).slice(
    0,
    MAX_ITEMS_PER_FEED
  ) as FeedItem[];

  const groups = new Map<string, AuthorGroup>();
  const content: ContentItemInput[] = [];

  for (const item of rawItems) {
    const haystack = `${item.title ?? ""}\n${itemBody(item)}`;
    const matchedTerms = matchKeywords(haystack, terms);
    // When keywords are configured, only keep items that match at least one.
    if (terms.length > 0 && matchedTerms.length === 0) continue;

    const author = resolveAuthor(item, feed);
    const key = authorKey(author, feedUrl);

    let group = groups.get(key);
    if (!group) {
      group = {
        key,
        author,
        feedUrl,
        feed,
        items: [],
        matched: new Set<string>(),
      };
      groups.set(key, group);
    }
    group.items.push(item);
    for (const term of matchedTerms) group.matched.add(term);
    if (!group.firstMatchTitle && matchedTerms.length > 0) {
      group.firstMatchTitle = item.title;
    }

    content.push({
      externalId: itemExternalId(feedUrl, item),
      type: "article",
      url: item.link,
      title: item.title,
      body: itemBody(item),
      authorHandle: author.name,
      lang: language,
      publishedAt: item.isoDate || item.pubDate,
      candidateExternalId: key,
      rawPayload: {
        feedUrl,
        feedTitle,
        author: {
          name: author.name,
          email: author.email ?? null,
          kind: author.isPublication ? "publication" : "author",
        },
        categories: item.categories ?? [],
        commentsUrl: item.comments ?? null,
        matchedKeywords: matchedTerms,
      },
    });
  }

  const candidates: RawCandidateInput[] = [];
  const profiles: ProfileInput[] = [];

  for (const group of groups.values()) {
    const { author } = group;
    const postsInFeed = group.items.length;
    const matchedKeywords = Array.from(group.matched);
    const profileUrl = author.email
      ? `mailto:${author.email}`
      : feedLink || feedUrl;

    const authorData = {
      name: author.name,
      email: author.email ?? null,
      link: profileUrl,
      kind: author.isPublication ? "publication" : "author",
      publication: feedTitle,
      feedUrl,
      feedLink: feedLink ?? null,
      language: language ?? null,
      postsInFeed,
      matchedKeywords,
    };

    const matchContext =
      group.firstMatchTitle ?? group.items[0]?.title ?? feedTitle;

    candidates.push({
      externalId: group.key,
      platformHandle: author.name,
      profileUrl,
      matchContext:
        matchedKeywords.length > 0
          ? `${matchContext} — matched: ${matchedKeywords.join(", ")}`
          : matchContext,
      rawPayload: authorData,
    });

    profiles.push({
      handle: author.name,
      externalId: group.key,
      followers: 0,
      posts: postsInFeed,
      audienceQuality: authorData,
    });
  }

  return { candidates, content, profiles };
}

export const rssAgent: DiscoveryAgent = {
  sourceKey: "rss",

  async run(net: NetRunContext): Promise<DiscoveryResult> {
    const feeds = getFeeds(net);
    if (feeds.length === 0) {
      throw new Error(
        "No feeds configured for RSS source (add feed URLs on the source setup page)"
      );
    }
    const terms = getKeywordTerms(net);

    const candidates: RawCandidateInput[] = [];
    const content: ContentItemInput[] = [];
    const profiles: ProfileInput[] = [];
    const errors: string[] = [];

    for (const feedUrl of feeds) {
      try {
        const result = await readFeed(feedUrl, terms);
        candidates.push(...result.candidates);
        content.push(...result.content);
        profiles.push(...result.profiles);
      } catch (error) {
        const detail =
          error instanceof Error
            ? error.message || error.toString()
            : String(error);
        errors.push(`${feedUrl}: ${detail || "could not fetch/parse feed"}`);
      }
      await sleep(FEED_DELAY_MS);
    }

    // Only fail the whole source if every feed errored. A run that fetched
    // feeds fine but matched nothing is a valid (empty) result.
    if (candidates.length === 0 && errors.length > 0) {
      throw new Error(`All feeds failed — ${errors.join("; ")}`);
    }

    return { candidates, content, profiles };
  },

  async fetchContent(handle: string): Promise<ContentItemInput[]> {
    // For RSS, the "handle" is a feed URL. No keyword filter on backfill.
    const { content } = await readFeed(normalizeFeedUrl(handle), []);
    return content;
  },

  async fetchMetrics(): Promise<ContentMetricsInput | null> {
    return null; // Feeds carry no engagement metrics.
  },
};
