import type { DateCategory, OriginalPlatform, QueryCategory } from "../types";
import { ALL_PLATFORM_HINTS } from "../platforms";

export { ALL_PLATFORM_HINTS };

export function buildDiscoveryQuery(
  baseQuery: string,
  platformHints: OriginalPlatform[] = ALL_PLATFORM_HINTS
): string {
  if (platformHints.length === 0) return baseQuery;
  const sites = platformHints
    .map((p) => {
      switch (p) {
        case "substack":
          return "site:substack.com";
        case "reddit":
          return "site:reddit.com";
        case "hackernews":
          return "site:news.ycombinator.com";
        case "youtube":
          return "site:youtube.com OR site:youtu.be";
        case "podcast":
          return "podcast OR site:spotify.com OR site:apple.com/podcast OR site:buzzsprout.com OR site:anchor.fm";
        case "blog":
          return "blog OR newsletter OR site:medium.com";
        case "news":
          return "news";
        default:
          return "";
      }
    })
    .filter(Boolean)
    .join(" OR ");
  return `${baseQuery} (${sites})`;
}

export function defaultPollingForDateCategory(
  dateCategory: DateCategory
): number {
  switch (dateCategory) {
    case "recent":
      return 60;
    case "trending":
      return 180;
    case "evergreen":
      return 720;
    default:
      return 60;
  }
}

export function defaultDateWindowForCategory(
  dateCategory: DateCategory
): number {
  switch (dateCategory) {
    case "recent":
      return 7;
    case "trending":
      return 30;
    case "evergreen":
      return 365;
    default:
      return 30;
  }
}

export function queryCategoryForProfile(
  profile: "pain_signals" | "icp_persuaders" | "icp_evaluators"
): QueryCategory {
  return profile;
}

export function defaultDateWindowForQueryCategory(
  queryCategory: QueryCategory
): number {
  switch (queryCategory) {
    case "pain_signals":
      return 30;
    case "icp_persuaders":
    case "icp_evaluators":
      return 90;
    default:
      return 30;
  }
}
