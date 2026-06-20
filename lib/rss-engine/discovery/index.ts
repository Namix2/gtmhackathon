import { rssEngineConfig } from "../config";
import { ExaClient, TavilyClient } from "./exa.client";
import { MockExaClient, MockTavilyClient } from "./mock-clients";
import { rssLogger } from "../logger";
import type { DiscoveryClient } from "./types";

export function getDiscoveryClients(
  providers: ("exa" | "tavily")[]
): DiscoveryClient[] {
  const { mockProviders, exaApiKey, tavilyApiKey } = rssEngineConfig();
  const clients: DiscoveryClient[] = [];

  for (const provider of providers) {
    if (provider === "exa") {
      if (mockProviders) {
        clients.push(new MockExaClient());
      } else if (exaApiKey) {
        clients.push(new ExaClient());
      } else {
        rssLogger.info("skipping exa — no EXA_API_KEY");
      }
    }
    if (provider === "tavily") {
      if (mockProviders) {
        clients.push(new MockTavilyClient());
      } else if (tavilyApiKey) {
        clients.push(new TavilyClient());
      } else {
        rssLogger.info("skipping tavily — no TAVILY_API_KEY");
      }
    }
  }

  return clients;
}

export function availableDiscoveryProviders(): ("exa" | "tavily")[] {
  const { mockProviders, exaApiKey, tavilyApiKey } = rssEngineConfig();
  if (mockProviders) return ["exa", "tavily"];
  const out: ("exa" | "tavily")[] = [];
  if (exaApiKey) out.push("exa");
  if (tavilyApiKey) out.push("tavily");
  return out;
}
