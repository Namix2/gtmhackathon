import { discoverySearchRequestSchema } from "@/lib/rss-engine/validation/schemas";
import { runDiscoverySearch } from "@/lib/rss-engine/services/query-runner";
import { handleRoute } from "@/lib/rss-engine/api/route-utils";

export async function POST(request: Request) {
  return handleRoute(async () => {
    const body = discoverySearchRequestSchema.parse(await request.json());
    return runDiscoverySearch(body);
  });
}
