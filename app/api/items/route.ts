import { searchFeedItems } from "@/lib/rss-engine/storage/repositories";
import {
  handleRoute,
  parseDate,
  parseNumber,
} from "@/lib/rss-engine/api/route-utils";

export async function GET(request: Request) {
  return handleRoute(async () => {
    const { searchParams } = new URL(request.url);
    const items = await searchFeedItems({
      q: searchParams.get("q") ?? undefined,
      platform: searchParams.get("platform") ?? undefined,
      publishedAfter: parseDate(searchParams.get("publishedAfter")),
      limit: parseNumber(searchParams.get("limit")),
    });
    return { items };
  });
}
