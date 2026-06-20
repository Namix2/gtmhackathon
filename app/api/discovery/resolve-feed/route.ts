import { resolveFeedRequestSchema } from "@/lib/rss-engine/validation/schemas";
import { resolveFeedUrl } from "@/lib/rss-engine/discovery/feed-url-resolver";
import { handleRoute } from "@/lib/rss-engine/api/route-utils";

export async function POST(request: Request) {
  return handleRoute(async () => {
    const body = resolveFeedRequestSchema.parse(await request.json());
    return resolveFeedUrl(body);
  });
}
