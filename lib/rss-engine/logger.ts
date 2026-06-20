type LogLevel = "debug" | "info" | "warn" | "error";

function log(level: LogLevel, message: string, meta?: Record<string, unknown>) {
  const payload = meta ? { message, ...meta } : { message };
  const line = `[rss-engine:${level}] ${JSON.stringify(payload)}`;
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const rssLogger = {
  debug: (message: string, meta?: Record<string, unknown>) =>
    log("debug", message, meta),
  info: (message: string, meta?: Record<string, unknown>) =>
    log("info", message, meta),
  warn: (message: string, meta?: Record<string, unknown>) =>
    log("warn", message, meta),
  error: (message: string, meta?: Record<string, unknown>) =>
    log("error", message, meta),
};
