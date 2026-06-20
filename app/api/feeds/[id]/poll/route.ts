import { pollFeedSource } from "@/lib/rss-engine/feeds/feed-poller";
import { handleRoute } from "@/lib/rss-engine/api/route-utils";
import { ApiError } from "@/lib/rss-engine/api/errors";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  return handleRoute(async () => {
    const { id } = await context.params;
    if (!id) throw new ApiError("NOT_FOUND", "Feed id is required", 404);
    return pollFeedSource(id);
  });
}
