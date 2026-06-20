import {
  listFeedSources,
  registerFeedSource,
} from "@/lib/rss-engine/storage/repositories";
import { registerFeedRequestSchema } from "@/lib/rss-engine/validation/schemas";
import {
  handleRoute,
  parseBool,
} from "@/lib/rss-engine/api/route-utils";

export async function POST(request: Request) {
  return handleRoute(async () => {
    const body = registerFeedRequestSchema.parse(await request.json());
    const { feed, created } = await registerFeedSource(body);
    return { id: feed.id, active: feed.active, created };
  });
}

export async function GET(request: Request) {
  return handleRoute(async () => {
    const { searchParams } = new URL(request.url);
    const feeds = await listFeedSources({
      platform: searchParams.get("platform") ?? undefined,
      active: parseBool(searchParams.get("active")),
      queryCategory: searchParams.get("queryCategory") ?? undefined,
      dateCategory: searchParams.get("dateCategory") ?? undefined,
    });
    return { feeds };
  });
}
