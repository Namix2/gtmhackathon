import { parseFeedXml } from "./feed-parser";

// Validates that a fetched document is a parseable RSS/Atom feed. Used by the
// resolver before it selects a native candidate (acceptance criterion: feed
// resolution must be deterministic and validated).

export interface FeedValidationResult {
  valid: boolean;
  reason?: string;
  itemCount?: number;
  title?: string;
}

export async function validateFeedXml(xml: string): Promise<FeedValidationResult> {
  const looksLikeFeed = /<rss[\s>]|<feed[\s>]|<rdf:RDF/i.test(xml);
  if (!looksLikeFeed) {
    return { valid: false, reason: "not_xml_feed" };
  }
  try {
    const feed = await parseFeedXml(xml);
    return {
      valid: true,
      itemCount: feed.items.length,
      title: feed.title,
    };
  } catch (error) {
    return {
      valid: false,
      reason: error instanceof Error ? error.message : "parse_error",
    };
  }
}
