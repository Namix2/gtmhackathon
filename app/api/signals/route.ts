import { searchSignals } from "@/lib/rss-engine/storage/repositories";
import {
  handleRoute,
  parseNumber,
} from "@/lib/rss-engine/api/route-utils";

export async function GET(request: Request) {
  return handleRoute(async () => {
    const { searchParams } = new URL(request.url);
    const signals = await searchSignals({
      queryCategory: searchParams.get("queryCategory") ?? undefined,
      icpCategory: searchParams.get("icpCategory") ?? undefined,
      minPainScore: parseNumber(searchParams.get("minPainScore")),
      minAiSlopScore: parseNumber(searchParams.get("minAiSlopScore")),
      minPriorityScore: parseNumber(searchParams.get("minPriorityScore")),
      limit: parseNumber(searchParams.get("limit")),
    });
    return { signals };
  });
}
