import { getDb } from '../../infra/db.js';

export type SettingKey =
  | 'rate_limit_per_min'
  | 'novelai_limit_mode'
  | 'allowed_guild_ids'
  | 'allowed_channel_ids';

export function getSetting(key: SettingKey): string | null {
  const row = getDb()
    .prepare('SELECT value FROM settings WHERE key = ?')
    .get(key) as { value: string } | undefined;

  return row?.value ?? null;
}

export function setSetting(key: SettingKey, value: string): void {
  getDb()
    .prepare(
      'INSERT INTO settings (key, value) VALUES (@key, @value) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    )
    .run({ key, value });
}

export function getAllSettings(): Record<string, string> {
  const rows = getDb()
    .prepare('SELECT key, value FROM settings')
    .all() as Array<{ key: string; value: string }>;

  const result: Record<string, string> = {};
  for (const row of rows) {
    result[row.key] = row.value;
  }
  return result;
}
