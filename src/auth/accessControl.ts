import type { ChatInputCommandInteraction } from 'discord.js';
import {
  getAllowedChannelIds,
  getAllowedGuildIds,
} from '../core/settings/settingsService.js';

export type AccessCheckResult = { ok: true } | { ok: false; reason: string };

function isSettingsCommand(commandName: string): boolean {
  return commandName === 'settings';
}

function parseAllowedSet(values: string[]): Set<string> {
  return new Set(values.filter(Boolean));
}

export function checkAllowlist(
  interaction: ChatInputCommandInteraction,
): AccessCheckResult {
  const allowedGuildIds = parseAllowedSet(getAllowedGuildIds());
  const allowedChannelIds = parseAllowedSet(getAllowedChannelIds());

  // 未配置白名单 => 不限制
  const guildRestricted = allowedGuildIds.size > 0;
  const channelRestricted = allowedChannelIds.size > 0;
  if (!guildRestricted && !channelRestricted) return { ok: true };

  // 有任一白名单启用时，默认不允许在 DM 中执行（guildId 为 null）
  if (!interaction.guildId) {
    return { ok: false, reason: '该命令仅允许在指定服务器/频道中使用。' };
  }

  if (guildRestricted && !allowedGuildIds.has(interaction.guildId)) {
    return { ok: false, reason: '该命令不允许在此服务器中使用。' };
  }

  if (channelRestricted) {
    const channelId = interaction.channelId;
    if (allowedChannelIds.has(channelId)) return { ok: true };

    const channel = interaction.channel;
    if (channel && 'isThread' in channel) {
      // Thread 场景：允许 parentId 命中
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const anyChannel = channel as any;
      if (typeof anyChannel.isThread === 'function' && anyChannel.isThread()) {
        const parentId: string | null | undefined = anyChannel.parentId;
        if (parentId && allowedChannelIds.has(parentId)) return { ok: true };
      }
    }

    return { ok: false, reason: '该命令不允许在此频道中使用。' };
  }

  return { ok: true };
}

export function checkInteractionAccess(
  interaction: ChatInputCommandInteraction,
): AccessCheckResult {
  // settings 命令需要可在任何位置配置白名单，因此跳过服务器/频道限制
  if (isSettingsCommand(interaction.commandName)) return { ok: true };

  return checkAllowlist(interaction);
}
