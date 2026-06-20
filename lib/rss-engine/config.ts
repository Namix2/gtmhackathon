export function rssEngineConfig() {
  const mockProviders =
    process.env.RSS_ENGINE_MOCK_PROVIDERS === "true" ||
    (!process.env.EXA_API_KEY && !process.env.TAVILY_API_KEY);

  return {
    exaApiKey: process.env.EXA_API_KEY ?? "",
    tavilyApiKey: process.env.TAVILY_API_KEY ?? "",
    rsshubBaseUrl:
      process.env.RSSHUB_BASE_URL?.replace(/\/$/, "") ??
      "https://rsshub.app",
    rssBridgeBaseUrl:
      process.env.RSSBRIDGE_BASE_URL?.replace(/\/$/, "") ??
      "https://rss-bridge.org/bridge01",
    rssAppApiKey: process.env.RSS_APP_API_KEY ?? "",
    rssAppBaseUrl: "https://api.rss.app",
    defaultPollIntervalMinutes: Number(
      process.env.DEFAULT_POLL_INTERVAL_MINUTES ?? "60"
    ),
    userAgent: process.env.USER_AGENT ?? "LightfernRSSBot/0.1",
    fetchTimeoutMs: Number(process.env.RSS_FETCH_TIMEOUT_MS ?? "10000"),
    fetchRetries: Number(process.env.RSS_FETCH_RETRIES ?? "1"),
    discoveryConcurrency: Number(process.env.RSS_DISCOVERY_CONCURRENCY ?? "8"),
    pollConcurrency: Number(process.env.RSS_POLL_CONCURRENCY ?? "6"),
    discoveryMaxResults: Number(process.env.RSS_DISCOVERY_MAX_RESULTS ?? "12"),
    mockProviders,
  };
}

export type RssEngineConfig = ReturnType<typeof rssEngineConfig>;
