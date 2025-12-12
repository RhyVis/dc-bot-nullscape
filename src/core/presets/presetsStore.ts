import { getDb } from '../../infra/db.js';

export interface PresetRow {
  id: string;
  name: string;
  description: string;
  qualityTags: string;
  negativeTags: string;
  createdAt: number;
  updatedAt: number;
}

export type PresetListItem = Pick<PresetRow, 'id' | 'name'>;

export function getPresetById(id: string): PresetRow | null {
  const row = getDb()
    .prepare(
      `SELECT id, name, description, quality_tags as qualityTags, negative_tags as negativeTags, created_at as createdAt, updated_at as updatedAt
       FROM presets
       WHERE id = ?`,
    )
    .get(id) as PresetRow | undefined;

  return row ?? null;
}

export function listPresets(limit = 25): PresetListItem[] {
  const rows = getDb()
    .prepare(
      `SELECT id, name
       FROM presets
       ORDER BY name ASC
       LIMIT ?`,
    )
    .all(limit) as PresetListItem[];

  return rows;
}

export function searchPresets(query: string, limit = 25): PresetListItem[] {
  const q = query.trim();
  if (q.length === 0) return listPresets(limit);

  const like = `%${q.replaceAll('%', '\\%').replaceAll('_', '\\_')}%`;

  const rows = getDb()
    .prepare(
      `SELECT id, name
       FROM presets
       WHERE id LIKE @like ESCAPE '\\'
          OR name LIKE @like ESCAPE '\\'
       ORDER BY
         CASE WHEN id = @exact THEN 0 ELSE 1 END,
         CASE WHEN id LIKE @prefix THEN 0 ELSE 1 END,
         name ASC
       LIMIT @limit`,
    )
    .all({ like, exact: q, prefix: `${q}%`, limit }) as PresetListItem[];

  return rows;
}

export function upsertPreset(input: {
  id: string;
  name: string;
  description: string;
  qualityTags: string;
  negativeTags: string;
}): PresetRow {
  const now = Date.now();

  getDb()
    .prepare(
      `INSERT INTO presets (id, name, description, quality_tags, negative_tags, created_at, updated_at)
       VALUES (@id, @name, @description, @qualityTags, @negativeTags, @now, @now)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         description = excluded.description,
         quality_tags = excluded.quality_tags,
         negative_tags = excluded.negative_tags,
         updated_at = excluded.updated_at`,
    )
    .run({ ...input, now });

  const row = getPresetById(input.id);
  if (!row) throw new Error('Preset upsert failed');
  return row;
}

export function deletePreset(id: string): boolean {
  const info = getDb().prepare('DELETE FROM presets WHERE id = ?').run(id);
  return info.changes > 0;
}
