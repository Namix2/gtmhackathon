import type { LogLevel } from "./config";

// Minimal structured logger. Emits single-line JSON so logs are greppable and
// machine-parseable, with a configurable level. No external dependency.

const LEVEL_WEIGHT: Record<LogLevel, number> = {
  silent: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4,
};

export interface Logger {
  error(msg: string, meta?: Record<string, unknown>): void;
  warn(msg: string, meta?: Record<string, unknown>): void;
  info(msg: string, meta?: Record<string, unknown>): void;
  debug(msg: string, meta?: Record<string, unknown>): void;
  child(context: Record<string, unknown>): Logger;
}

function emit(
  level: Exclude<LogLevel, "silent">,
  minWeight: number,
  context: Record<string, unknown>,
  msg: string,
  meta?: Record<string, unknown>
): void {
  if (LEVEL_WEIGHT[level] > minWeight) return;
  const line = {
    ts: new Date().toISOString(),
    level,
    msg,
    ...context,
    ...(meta ?? {}),
  };
  const text = JSON.stringify(line);
  if (level === "error") console.error(text);
  else if (level === "warn") console.warn(text);
  else console.log(text);
}

export function createLogger(
  level: LogLevel = "info",
  context: Record<string, unknown> = {}
): Logger {
  const minWeight = LEVEL_WEIGHT[level] ?? LEVEL_WEIGHT.info;
  return {
    error: (msg, meta) => emit("error", minWeight, context, msg, meta),
    warn: (msg, meta) => emit("warn", minWeight, context, msg, meta),
    info: (msg, meta) => emit("info", minWeight, context, msg, meta),
    debug: (msg, meta) => emit("debug", minWeight, context, msg, meta),
    child: (childContext) =>
      createLogger(level, { ...context, ...childContext }),
  };
}
