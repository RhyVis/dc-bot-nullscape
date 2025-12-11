import { logger } from "./logger.js";
import { getRateLimitPerMin } from "../services/settingsService.js";

interface CheckOptions {
  userId: string;
  command: string;
  isAdmin: boolean;
}

interface CheckResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs?: number;
}

const WINDOW_MS = 60_000;

let windowStart = Date.now();
let count = 0;

function resetWindow(now: number): void {
  windowStart = now;
  count = 0;
}

export const rateLimiter = {
  checkAndConsume(options: CheckOptions): CheckResult {
    const now = Date.now();

    // Reset window if expired
    if (now - windowStart >= WINDOW_MS) {
      resetWindow(now);
    }

    // Admin bypass
    if (options.isAdmin) {
      const currentLimit = Math.max(1, getRateLimitPerMin());
      return { allowed: true, remaining: currentLimit };
    }

    const limit = Math.max(1, getRateLimitPerMin());

    if (count >= limit) {
      const retryAfterMs = WINDOW_MS - (now - windowStart);
      logger.warn("Rate limit hit", {
        userId: options.userId,
        command: options.command,
        limit,
        windowMs: WINDOW_MS,
      });
      return {
        allowed: false,
        remaining: 0,
        retryAfterMs,
      };
    }

    count += 1;
    const remaining = Math.max(0, limit - count);

    return { allowed: true, remaining };
  },
};
