import { rssEngineConfig } from "../config";

export type RssBridgeFormat = "Atom" | "Html" | "Json" | "MediaRSS";

export function buildRssBridgeUrl(input: {
  bridge: string;
  params: Record<string, string>;
  format?: RssBridgeFormat;
}): string {
  const base = rssEngineConfig().rssBridgeBaseUrl;
  const url = new URL(base.endsWith("/") ? base : `${base}/`);
  url.searchParams.set("action", "display");
  url.searchParams.set("bridge", input.bridge);
  url.searchParams.set("format", input.format ?? "Atom");
  for (const [key, value] of Object.entries(input.params)) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

export function buildSubstackBridgeUrl(publication: string): string {
  return buildRssBridgeUrl({
    bridge: "SubstackBridge",
    params: { publication },
  });
}

export function buildRedditBridgeUrl(subreddit: string): string {
  return buildRssBridgeUrl({
    bridge: "RedditBridge",
    params: { r: subreddit },
  });
}
