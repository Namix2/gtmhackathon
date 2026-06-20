// Environment-variable based configuration for the RSS Engine.
//
// All external-service configuration is read here so the rest of the engine
// never touches process.env directly. When provider keys are missing (or
// RSS_ENGINE_USE_MOCKS=true) the engine runs fully on deterministic mocks, so
// it works locally with no production keys.

export interface EngineConfig {
  exaApiKey?: string;
  exaBaseUrl: string;
  tavilyApiKey?: string;
  tavilyBaseUrl: string;
  rsshubBaseUrl: string;
  rssbridgeBaseUrl: string;
  rssAppApiKey?: string;
  rssAppBaseUrl: string;
  databaseUrl?: string;
  redisUrl?: string;
  defaultPollIntervalMinutes: number;
  userAgent: string;
  httpTimeoutMs: number;
  httpMaxRetries: number;
  // Force every external provider onto its deterministic mock.
  useMocks: boolean;
  logLevel: LogLevel;
}

export type LogLevel = "silent" | "error" | "warn" | "info" | "debug";

function num(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && value !== undefined && value !== ""
    ? parsed
    : fallback;
}

function bool(value: string | undefined, fallback = false): boolean {
  if (value === undefined || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function clean(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): EngineConfig {
  const exaApiKey = clean(env.EXA_API_KEY);
  const tavilyApiKey = clean(env.TAVILY_API_KEY);
  const rssAppApiKey = clean(env.RSS_APP_API_KEY);

  // Mocks are used when explicitly requested, or implicitly when NO search
  // provider keys are configured (so a fresh checkout runs end-to-end).
  const explicitMocks = bool(env.RSS_ENGINE_USE_MOCKS, false);
  const noSearchKeys = !exaApiKey && !tavilyApiKey;

  return {
    exaApiKey,
    exaBaseUrl: clean(env.EXA_BASE_URL) ?? "https://api.exa.ai",
    tavilyApiKey,
    tavilyBaseUrl: clean(env.TAVILY_BASE_URL) ?? "https://api.tavily.com",
    rsshubBaseUrl: clean(env.RSSHUB_BASE_URL) ?? "https://rsshub.app",
    rssbridgeBaseUrl:
      clean(env.RSSBRIDGE_BASE_URL) ?? "https://rss-bridge.org/bridge01/",
    rssAppApiKey,
    rssAppBaseUrl: clean(env.RSS_APP_BASE_URL) ?? "https://api.rss.app",
    databaseUrl: clean(env.DATABASE_URL),
    redisUrl: clean(env.REDIS_URL),
    defaultPollIntervalMinutes: num(env.DEFAULT_POLL_INTERVAL_MINUTES, 60),
    userAgent: clean(env.USER_AGENT) ?? "LightfernRSSBot/0.1",
    httpTimeoutMs: num(env.RSS_ENGINE_HTTP_TIMEOUT_MS, 15000),
    httpMaxRetries: num(env.RSS_ENGINE_HTTP_MAX_RETRIES, 2),
    useMocks: explicitMocks || noSearchKeys,
    logLevel: (clean(env.LOG_LEVEL) as LogLevel) ?? "info",
  };
}
