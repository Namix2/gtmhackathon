import type {
  ContentItemInput,
  ContentMetricsInput,
  DiscoveryAgent,
  DiscoveryResult,
  NetRunContext,
} from "./types";

// LinkedIn discovery agent.
//
// LinkedIn has no general content API and scraping violates its ToS. A compliant
// implementation uses either a licensed enrichment/data provider (adapter) or a
// manual/CSV import that writes into the same ContentItem / ProfileSnapshot
// tables. This stub preserves the interface so a provider/import adapter can be
// dropped in without changing downstream stages.
export const linkedinAgent: DiscoveryAgent = {
  sourceKey: "linkedin",

  async run(_net: NetRunContext): Promise<DiscoveryResult> {
    throw new Error("Not implemented");
  },

  async fetchContent(_handle: string): Promise<ContentItemInput[]> {
    throw new Error("Not implemented");
  },

  async fetchMetrics(_externalId: string): Promise<ContentMetricsInput | null> {
    throw new Error("Not implemented");
  },
};
