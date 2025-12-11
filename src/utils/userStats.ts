export interface UserStats {
  /** 图片生成总数（draw + imagine 等） */
  images: number;
  /** 翻译总数（/translate 等） */
  translations: number;
}

const statsMap = new Map<string, UserStats>();

function getOrCreateStats(userId: string): UserStats {
  let stats = statsMap.get(userId);
  if (!stats) {
    stats = { images: 0, translations: 0 };
    statsMap.set(userId, stats);
  }
  return stats;
}

export function incrementImageStat(userId: string): UserStats {
  const stats = getOrCreateStats(userId);
  stats.images += 1;
  return { ...stats };
}

export function incrementTranslationStat(userId: string): UserStats {
  const stats = getOrCreateStats(userId);
  stats.translations += 1;
  return { ...stats };
}

export function formatGoodDeedText(stats: UserStats): string {
  const total = stats.images + stats.translations;
  return [
    `累计好事：${total} 次`,
    `- 图片生成：${stats.images} 次`,
    `- 文本翻译：${stats.translations} 次`,
  ].join("\n");
}
