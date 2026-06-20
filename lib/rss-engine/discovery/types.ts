import type { DiscoveryProvider, DiscoveryResultItem, OriginalPlatform } from "../types";

export type SearchInput = {
  query: string;
  dateWindowDays?: number;
  maxResults?: number;
  platformHints?: OriginalPlatform[];
};

export interface DiscoveryClient {
  provider: DiscoveryProvider;
  search(input: SearchInput): Promise<DiscoveryResultItem[]>;
}

export function inferPlatformFromUrl(url: string): OriginalPlatform {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host.includes("substack.com")) return "substack";
    if (host.includes("reddit.com")) return "reddit";
    if (host.includes("news.ycombinator.com")) return "hackernews";
    if (host.includes("youtube.com") || host.includes("youtu.be"))
      return "youtube";
    if (
      host.includes("spotify.com") ||
      host.includes("podcasts.apple.com") ||
      host.includes("buzzsprout.com") ||
      host.includes("anchor.fm") ||
      host.includes("podbean.com") ||
      host.includes("libsyn.com") ||
      host.includes("simplecast.com") ||
      host.includes("transistor.fm") ||
      host.includes("megaphone.fm")
    ) {
      return "podcast";
    }
    if (host.includes("medium.com")) return "blog";
    if (host.includes("wordpress.com") || host.includes("blogspot"))
      return "blog";
    return "news";
  } catch {
    return "unknown";
  }
}
