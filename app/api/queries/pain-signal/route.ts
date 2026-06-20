import { painSignalQuerySchema } from "@/lib/rss-engine/validation/schemas";
import { runPainSignalQuery } from "@/lib/rss-engine/services/query-runner";
import { handleRoute } from "@/lib/rss-engine/api/route-utils";

export async function POST(request: Request) {
  return handleRoute(async () => {
    const body = painSignalQuerySchema.parse(await request.json());
    return runPainSignalQuery(body);
  });
}
