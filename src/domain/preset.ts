import { normalizeEmphasis } from './syntax.js';

function normalizeCommaList(text: string): string {
  const normalized = text.replaceAll('\n', ',').replaceAll('\r', ',');
  const parts = normalized
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);

  return parts.join(', ');
}

/**
 * 将管理员输入的 tags 自动格式化为“内部统一格式”以便稳定存储：
 * - 归一化 V3/V4 强调语法到统一 <tag:weight> 形式
 * - 清理空白/换行，并按逗号分隔规范化
 */
export function normalizePresetText(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length === 0) return '';

  const unified = normalizeEmphasis(trimmed);
  return normalizeCommaList(unified);
}
