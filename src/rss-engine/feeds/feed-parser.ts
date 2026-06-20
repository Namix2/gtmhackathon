import Parser from "rss-parser";
import type { ParsedFeed, ParsedFeedItem } from "../types";

// Wraps rss-parser and maps its output onto our internal ParsedFeed shape so the
// rest of the engine never depends on the parser's types.

type RssItem = {
  title?: string;
  link?: string;
  guid?: string;
  isoDate?: string;
  pubDate?: string;
  creator?: string;
  author?: string;
  summary?: string;
  content?: string;
  contentSnippet?: string;
  "content:encoded"?: string;
  categories?: string[];
};

const parser: Parser<Record<string, unknown>, RssItem> = new Parser({
  customFields: {
    item: [["content:encoded", "content:encoded"]],
  },
});

export async function parseFeedXml(xml: string): Promise<ParsedFeed> {
  const feed = await parser.parseString(xml);
  const items: ParsedFeedItem[] = (feed.items ?? []).map((item) => ({
    title: item.title,
    link: item.link,
    guid: item.guid,
    isoDate: item.isoDate,
    pubDate: item.pubDate,
    creator: item.creator,
    author: item.author,
    summary: item.summary,
    content: item.content,
    contentSnippet: item.contentSnippet,
    contentEncoded: item["content:encoded"],
    categories: item.categories,
  }));
  return {
    title: feed.title,
    link: feed.link,
    description: feed.description,
    items,
  };
}
