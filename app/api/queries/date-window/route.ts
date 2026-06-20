import { dateWindowQuerySchema } from "@/lib/rss-engine/validation/schemas";
import { runDateWindowQuery } from "@/lib/rss-engine/services/query-runner";
import { handleRoute } from "@/lib/rss-engine/api/route-utils";

export async function POST(request: Request) {
  return handleRoute(async () => {
    const body = dateWindowQuerySchema.parse(await request.json());
    return runDateWindowQuery(body);
  });
}
