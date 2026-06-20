import type { FeedItem } from "../types";
import type { FeedItemFilter, Repositories } from "../storage/repositories";

// Item service — search/filter canonical feed items (GET /api/items).

export interface ItemService {
  searchItems(filter?: FeedItemFilter): Promise<{ items: FeedItem[] }>;
}

export function createItemService(deps: { repos: Repositories }): ItemService {
  return {
    async searchItems(filter) {
      const items = await deps.repos.feedItems.search(filter);
      return { items };
    },
  };
}
