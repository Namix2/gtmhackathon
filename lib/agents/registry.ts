import { linkedinAgent } from "./linkedin";
import { redditAgent } from "./reddit";
import { rssAgent } from "./rss";
import type { DiscoveryAgent } from "./types";
import { xAgent } from "./x";

export const agentRegistry: Record<string, DiscoveryAgent> = {
  reddit: redditAgent,
  x: xAgent,
  linkedin: linkedinAgent,
  rss: rssAgent,
};

export const registeredSourceKeys = Object.keys(agentRegistry) as Array<
  DiscoveryAgent["sourceKey"]
>;
