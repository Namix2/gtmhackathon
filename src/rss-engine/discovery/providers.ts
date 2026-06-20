import type { SearchProviderName } from "../types";

// Common interface for external discovery providers (Exa, Tavily). Real clients
// and the deterministic mock all implement this, so the discovery service is
// provider-agnostic and fully testable.

export interface ProviderSearchInput {
  query: string;
  maxResults: number;
  dateWindowDays?: number;
  platformHints: string[];
}

export interface ProviderSearchResult {
  url: string;
  title?: string;
  summary?: string;
  publishedAt?: string;
  rawContent?: string;
}

export interface SearchProvider {
  readonly name: SearchProviderName;
  isAvailable(): boolean;
  search(input: ProviderSearchInput): Promise<ProviderSearchResult[]>;
}
