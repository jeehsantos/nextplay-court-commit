/**
 * Conditional logger for edge functions.
 * - log/info/debug: only emitted when DEBUG env var is truthy ("1", "true").
 * - warn/error: always emitted (needed for production observability).
 *
 * Usage:
 *   import { logger } from "../_shared/logger.ts";
 *   logger.log("processing", { id });   // silenced in production
 *   logger.error("failed", err);        // always logged
 */
const DEBUG = (() => {
  try {
    const v = Deno.env.get("DEBUG") ?? "";
    return v === "1" || v.toLowerCase() === "true";
  } catch {
    return false;
  }
})();

type LogFn = (...args: unknown[]) => void;

const noop: LogFn = () => {};

export const logger = {
  log: (DEBUG ? console.log.bind(console) : noop) as LogFn,
  info: (DEBUG ? console.info.bind(console) : noop) as LogFn,
  debug: (DEBUG ? console.debug.bind(console) : noop) as LogFn,
  warn: console.warn.bind(console) as LogFn,
  error: console.error.bind(console) as LogFn,
};
