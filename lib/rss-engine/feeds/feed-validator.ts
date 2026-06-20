import { validateFeedUrl } from "./feed-parser";

export async function assertValidFeed(feedUrl: string): Promise<void> {
  const ok = await validateFeedUrl(feedUrl);
  if (!ok) {
    throw new Error("Resolved URL did not return a valid RSS or Atom feed.");
  }
}
