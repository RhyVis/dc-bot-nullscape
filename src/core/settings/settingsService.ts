import { config } from '../config.js';
import { logger } from '../logger.js';
import { getSetting, setSetting, getAllSettings } from './settingsStore.js';

export interface RuntimeSettings {
  rateLimitPerMin: number;
  novelaiLimitMode: boolean;
  allowedGuildIds: string[];
  allowedChannelIds: string[];
}

let cachedSettings: RuntimeSettings | null = null;

function parseBoolean(value: string, defaultValue: boolean): boolean {
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return defaultValue;
}

function parseIdList(value: string | null): string[] {
  if (!value) return [];
  const items = value
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
  return Array.from(new Set(items));
}

function serializeIdList(ids: string[]): string {
  const unique = Array.from(new Set(ids.map((v) => v.trim()).filter(Boolean)));
  return unique.join(',');
}

function loadFromStoreOrEnv(): RuntimeSettings {
  const envRate = config.rateLimit.requestsPerMinute;
  const envLimitMode = config.novelai.limitMode;

  const storedRate = getSetting('rate_limit_per_min');
  const storedLimitMode = getSetting('novelai_limit_mode');
  const storedAllowedGuildIds = getSetting('allowed_guild_ids');
  const storedAllowedChannelIds = getSetting('allowed_channel_ids');

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
    setSetting('rate_limit_per_min', String(rateLimitPerMin));
  }
  if (storedLimitMode === null) {
    setSetting('novelai_limit_mode', novelaiLimitMode ? '1' : '0');
  }

  // 权限白名单只走 settings（不依赖 env），缺失则初始化为空（不限制）
  const allowedGuildIds = parseIdList(storedAllowedGuildIds);
  const allowedChannelIds = parseIdList(storedAllowedChannelIds);

  if (storedAllowedGuildIds === null) {
    setSetting('allowed_guild_ids', '');
  }
  if (storedAllowedChannelIds === null) {
    setSetting('allowed_channel_ids', '');
  }

  const runtime: RuntimeSettings = {
    rateLimitPerMin,
    novelaiLimitMode,
    allowedGuildIds,
    allowedChannelIds,
  };

  logger.info('Runtime settings loaded', {
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

  setSetting('rate_limit_per_min', String(sanitized));

  logger.info('Rate limit updated', {
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

  setSetting('novelai_limit_mode', enabled ? '1' : '0');

  logger.info('NovelAI limit mode updated', {
    novelaiLimitMode: enabled,
  });

  return { ...cachedSettings };
}

export function getAllowedGuildIds(): string[] {
  ensureInitialized();
  return [...cachedSettings!.allowedGuildIds];
}

export function getAllowedChannelIds(): string[] {
  ensureInitialized();
  return [...cachedSettings!.allowedChannelIds];
}

export function setAllowedGuildIds(ids: string[]): RuntimeSettings {
  ensureInitialized();

  const normalized = Array.from(
    new Set(ids.map((v) => v.trim()).filter(Boolean)),
  );

  cachedSettings = {
    ...cachedSettings!,
    allowedGuildIds: normalized,
  };

  setSetting('allowed_guild_ids', serializeIdList(normalized));

  logger.info('Allowed guild IDs updated', {
    allowedGuildIds: normalized,
  });

  return { ...cachedSettings };
}

export function setAllowedChannelIds(ids: string[]): RuntimeSettings {
  ensureInitialized();

  const normalized = Array.from(
    new Set(ids.map((v) => v.trim()).filter(Boolean)),
  );

  cachedSettings = {
    ...cachedSettings!,
    allowedChannelIds: normalized,
  };

  setSetting('allowed_channel_ids', serializeIdList(normalized));

  logger.info('Allowed channel IDs updated', {
    allowedChannelIds: normalized,
  });

  return { ...cachedSettings };
}

export function getRuntimeSettings(): RuntimeSettings {
  ensureInitialized();
  return { ...cachedSettings! };
}
