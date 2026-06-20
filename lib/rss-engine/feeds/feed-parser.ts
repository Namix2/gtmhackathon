import Parser from "rss-parser";
import { rssEngineConfig } from "../config";

const parser = new Parser({
  timeout: 15000,
  headers: {
    "User-Agent": rssEngineConfig().userAgent,
  },
});

export type ParsedFeed = {
  title?: string;
  link?: string;
  items: {
    title?: string;
    link?: string;
    guid?: string;
    isoDate?: string;
    pubDate?: string;
    creator?: string;
    author?: string;
    content?: string;
    contentSnippet?: string;
    categories?: string[];
  }[];
};

export async function parseFeedUrl(
  feedUrl: string,
  maxItems?: number
): Promise<ParsedFeed> {
  const feed = await parser.parseURL(feedUrl);
  const items = (feed.items ?? []).map((item) => ({
    title: item.title,
    link: item.link,
    guid: item.guid,
    isoDate: item.isoDate,
    pubDate: item.pubDate,
    creator: item.creator,
    author: item.author,
    content: item.content,
    contentSnippet: item.contentSnippet,
    categories: item.categories,
  }));
  return {
    title: feed.title,
    link: feed.link,
    items: maxItems ? items.slice(0, maxItems) : items,
  };
}

export async function validateFeedUrl(feedUrl: string): Promise<boolean> {
  try {
    const feed = await parseFeedUrl(feedUrl);
    return (feed.items?.length ?? 0) >= 0;
  } catch {
    return false;
  }
}
