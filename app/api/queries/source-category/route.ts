import { sourceCategoryQuerySchema } from "@/lib/rss-engine/validation/schemas";
import { runSourceCategoryQuery } from "@/lib/rss-engine/services/query-runner";
import { handleRoute } from "@/lib/rss-engine/api/route-utils";

export async function POST(request: Request) {
  return handleRoute(async () => {
    const body = sourceCategoryQuerySchema.parse(await request.json());
    return runSourceCategoryQuery(body);
  });
}
