import { config } from "../utils/config.js";
import { logger } from "../utils/logger.js";
import {
  getSetting,
  setSetting,
  getAllSettings,
  SettingKey,
} from "./settingsStore.js";

export interface RuntimeSettings {
  rateLimitPerMin: number;
  novelaiLimitMode: boolean;
}

let cachedSettings: RuntimeSettings | null = null;

function parseBoolean(value: string, defaultValue: boolean): boolean {
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return defaultValue;
}

function loadFromStoreOrEnv(): RuntimeSettings {
  const envRate = config.rateLimit.requestsPerMinute;
  const envLimitMode = config.novelai.limitMode;

  const storedRate = getSetting("rate_limit_per_min");
  const storedLimitMode = getSetting("novelai_limit_mode");

  let rateLimitPerMin = storedRate !== null ? Number(storedRate) : envRate;
  if (!Number.isFinite(rateLimitPerMin) || rateLimitPerMin <= 0) {
    rateLimitPerMin = envRate;
  }

  let novelaiLimitMode: boolean;
  if (storedLimitMode === null) {
    novelaiLimitMode = envLimitMode;
  } else {
    novelaiLimitMode = parseBoolean(storedLimitMode, envLimitMode);
  }

  // 将缺失的存储初始化为 env 默认
  if (storedRate === null) {
    setSetting("rate_limit_per_min", String(rateLimitPerMin));
  }
  if (storedLimitMode === null) {
    setSetting("novelai_limit_mode", novelaiLimitMode ? "1" : "0");
  }

  const runtime: RuntimeSettings = {
    rateLimitPerMin,
    novelaiLimitMode,
  };

  logger.info("Runtime settings loaded", {
    settings: runtime,
    raw: getAllSettings(),
  });

  return runtime;
}

function ensureInitialized(): void {
  if (!cachedSettings) {
    cachedSettings = loadFromStoreOrEnv();
  }
}

export async function initSettings(): Promise<void> {
  ensureInitialized();
}

export function getRateLimitPerMin(): number {
  ensureInitialized();
  return cachedSettings!.rateLimitPerMin;
}

export function getLimitMode(): boolean {
  ensureInitialized();
  return cachedSettings!.novelaiLimitMode;
}

export function setRateLimitPerMin(value: number): RuntimeSettings {
  ensureInitialized();

  const sanitized = Number.isFinite(value) && value > 0 ? Math.floor(value) : 1;

  cachedSettings = {
    ...cachedSettings!,
    rateLimitPerMin: sanitized,
  };

  setSetting("rate_limit_per_min", String(sanitized));

  logger.info("Rate limit updated", {
    rateLimitPerMin: sanitized,
  });

  return { ...cachedSettings };
}

export function setLimitMode(enabled: boolean): RuntimeSettings {
  ensureInitialized();

  cachedSettings = {
    ...cachedSettings!,
    novelaiLimitMode: enabled,
  };

  setSetting("novelai_limit_mode", enabled ? "1" : "0");

  logger.info("NovelAI limit mode updated", {
    novelaiLimitMode: enabled,
  });

  return { ...cachedSettings };
}

export function getRuntimeSettings(): RuntimeSettings {
  ensureInitialized();
  return { ...cachedSettings! };
}
