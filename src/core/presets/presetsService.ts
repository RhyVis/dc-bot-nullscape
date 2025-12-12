import type { PromptPreset } from '../../types/presets.js';
import { normalizeEmphasis } from '../../domain/syntax.js';
import {
  deletePreset,
  getPresetById,
  listPresets,
  searchPresets,
  upsertPreset,
} from './presetsStore.js';

function normalizePresetText(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length === 0) return '';

  const unified = normalizeEmphasis(trimmed);
  const normalized = unified.replaceAll('\n', ',').replaceAll('\r', ',');
  const parts = normalized
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);

  return parts.join(', ');
}

export function getPreset(id: string): PromptPreset | null {
  const row = getPresetById(id);
  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    qualityTags: row.qualityTags,
    negativeTags: row.negativeTags,
  };
}

export function listPresetSummaries(
  limit = 25,
): Array<{ id: string; name: string }> {
  return listPresets(limit);
}

export function searchPresetSummaries(
  query: string,
  limit = 25,
): Array<{ id: string; name: string }> {
  return searchPresets(query, limit);
}

export function upsertPresetNormalized(input: {
  id: string;
  name: string;
  description?: string;
  qualityTags?: string;
  negativeTags?: string;
}): PromptPreset {
  const row = upsertPreset({
    id: input.id.trim(),
    name: input.name.trim(),
    description: (input.description ?? '').trim(),
    qualityTags: normalizePresetText(input.qualityTags ?? ''),
    negativeTags: normalizePresetText(input.negativeTags ?? ''),
  });

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    qualityTags: row.qualityTags,
    negativeTags: row.negativeTags,
  };
}

export function deletePresetById(id: string): boolean {
  return deletePreset(id);
}
