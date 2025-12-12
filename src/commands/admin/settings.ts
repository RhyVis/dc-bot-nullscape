import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from 'discord.js';
import { Command } from '../../types/commands.js';
import { isAdminUser } from '../../auth/adminAuth.js';
import {
  deletePresetById,
  getPreset,
  listPresetSummaries,
  upsertPresetNormalized,
} from '../../core/presets/presetsService.js';
import {
  getRuntimeSettings,
  setRateLimitPerMin,
  setLimitMode,
  setAllowedGuildIds,
  setAllowedChannelIds,
} from '../../core/settings/settingsService.js';

function validatePresetId(id: string): string | null {
  const trimmed = id.trim();
  if (trimmed.length === 0) return 'preset id 不能为空';
  if (trimmed.length > 64) return 'preset id 过长（最多 64 字符）';
  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    return 'preset id 仅允许字母、数字、下划线、短横线';
  }
  return null;
}

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName('settings')
    .setDescription('查看或修改 Bot 设置 (仅管理员)')
    .addSubcommand((subcommand) =>
      subcommand.setName('show').setDescription('查看当前设置'),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('set_rate_limit')
        .setDescription('设置每分钟全局请求上限')
        .addIntegerOption((option) =>
          option
            .setName('value')
            .setDescription('每分钟请求数 (1-60)')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(60),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('set_limit_mode')
        .setDescription('开关 NovelAI 限制模式 (1024x1024 以下无限额度)')
        .addBooleanOption((option) =>
          option
            .setName('enabled')
            .setDescription('是否启用限制模式')
            .setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('set_allowed_guilds')
        .setDescription(
          '设置允许使用命令的服务器 ID 列表（逗号分隔；留空=不限制）',
        )
        .addStringOption((option) =>
          option
            .setName('ids')
            .setDescription('如：123,456；设置为空字符串可清空')
            .setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('set_allowed_channels')
        .setDescription(
          '设置允许使用命令的频道 ID 列表（逗号分隔；留空=不限制）',
        )
        .addStringOption((option) =>
          option
            .setName('ids')
            .setDescription('如：123,456；设置为空字符串可清空')
            .setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('preset_list').setDescription('列出预设 (最多 25 条)'),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('preset_get')
        .setDescription('查看指定预设')
        .addStringOption((option) =>
          option.setName('id').setDescription('预设 ID').setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('preset_upsert')
        .setDescription('新增或更新预设 (自动格式化)')
        .addStringOption((option) =>
          option
            .setName('id')
            .setDescription('预设 ID（全局唯一）')
            .setRequired(true),
        )
        .addStringOption((option) =>
          option.setName('name').setDescription('显示名称').setRequired(true),
        )
        .addStringOption((option) =>
          option
            .setName('description')
            .setDescription('描述（可选）')
            .setRequired(false),
        )
        .addStringOption((option) =>
          option
            .setName('quality')
            .setDescription('质量/正向前置 tags（可选）')
            .setRequired(false),
        )
        .addStringOption((option) =>
          option
            .setName('negative')
            .setDescription('负向 tags（可选）')
            .setRequired(false),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('preset_delete')
        .setDescription('删除指定预设')
        .addStringOption((option) =>
          option.setName('id').setDescription('预设 ID').setRequired(true),
        ),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const userId = interaction.user.id;
    const isAdmin = isAdminUser(userId);

    if (!isAdmin) {
      await interaction.reply({
        content: '❌ 你没有权限使用此命令。',
        ephemeral: true,
      });
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    await interaction.deferReply({ ephemeral: true });

    if (subcommand === 'show') {
      const settings = getRuntimeSettings();

      const embed = new EmbedBuilder()
        .setColor(0x7289da)
        .setTitle('⚙ 当前设置')
        .addFields(
          {
            name: '⏱ 每分钟请求数',
            value: `${settings.rateLimitPerMin}`,
          },
          {
            name: '⛔ NAI 限制模式',
            value: settings.novelaiLimitMode ? '已启用' : '已关闭',
          },
          {
            name: '🏠 允许服务器 (Guild) ID',
            value:
              settings.allowedGuildIds.length > 0
                ? settings.allowedGuildIds.join(', ')
                : '（不限制）',
          },
          {
            name: '🧵 允许频道 (Channel) ID',
            value:
              settings.allowedChannelIds.length > 0
                ? settings.allowedChannelIds.join(', ')
                : '（不限制）',
          },
        )
        .setFooter({
          text: '仅 ADMIN_USER_IDS 中的用户可以修改设置',
        })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (subcommand === 'set_rate_limit') {
      const value = interaction.options.getInteger('value', true);
      const before = getRuntimeSettings();
      const after = setRateLimitPerMin(value);

      const embed = new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle('✅ 已更新每分钟请求数')
        .addFields(
          {
            name: '之前',
            value: `${before.rateLimitPerMin}`,
            inline: true,
          },
          {
            name: '现在',
            value: `${after.rateLimitPerMin}`,
            inline: true,
          },
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (subcommand === 'set_limit_mode') {
      const enabled = interaction.options.getBoolean('enabled', true);
      const before = getRuntimeSettings();
      const after = setLimitMode(enabled);

      const embed = new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle('✅ 已更新 NAI 限制模式')
        .addFields(
          {
            name: '之前',
            value: before.novelaiLimitMode ? '已启用' : '已关闭',
            inline: true,
          },
          {
            name: '现在',
            value: after.novelaiLimitMode ? '已启用' : '已关闭',
            inline: true,
          },
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (subcommand === 'set_allowed_guilds') {
      const raw = interaction.options.getString('ids', true);
      const ids = raw
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean);

      const before = getRuntimeSettings();
      const after = setAllowedGuildIds(ids);

      const embed = new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle('✅ 已更新允许服务器列表')
        .addFields(
          {
            name: '之前',
            value:
              before.allowedGuildIds.length > 0
                ? before.allowedGuildIds.join(', ')
                : '（不限制）',
          },
          {
            name: '现在',
            value:
              after.allowedGuildIds.length > 0
                ? after.allowedGuildIds.join(', ')
                : '（不限制）',
          },
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (subcommand === 'set_allowed_channels') {
      const raw = interaction.options.getString('ids', true);
      const ids = raw
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean);

      const before = getRuntimeSettings();
      const after = setAllowedChannelIds(ids);

      const embed = new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle('✅ 已更新允许频道列表')
        .addFields(
          {
            name: '之前',
            value:
              before.allowedChannelIds.length > 0
                ? before.allowedChannelIds.join(', ')
                : '（不限制）',
          },
          {
            name: '现在',
            value:
              after.allowedChannelIds.length > 0
                ? after.allowedChannelIds.join(', ')
                : '（不限制）',
          },
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (subcommand === 'preset_list') {
      const items = listPresetSummaries(25);
      const lines =
        items.length === 0
          ? '（暂无预设）'
          : items.map((p) => `• ${p.id} - ${p.name}`).join('\n');

      const embed = new EmbedBuilder()
        .setColor(0x7289da)
        .setTitle('🎭 预设列表')
        .setDescription(lines)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (subcommand === 'preset_get') {
      const id = interaction.options.getString('id', true);
      const idError = validatePresetId(id);
      if (idError) {
        await interaction.editReply({ content: `❌ ${idError}` });
        return;
      }

      const preset = getPreset(id);
      if (!preset) {
        await interaction.editReply({ content: `❌ 未找到预设: ${id}` });
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(0x7289da)
        .setTitle(`🎭 预设: ${preset.id}`)
        .addFields(
          { name: '名称', value: preset.name },
          { name: '描述', value: preset.description || '（无）' },
          { name: 'Quality', value: preset.qualityTags || '（空）' },
          { name: 'Negative', value: preset.negativeTags || '（空）' },
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (subcommand === 'preset_upsert') {
      const id = interaction.options.getString('id', true);
      const name = interaction.options.getString('name', true);
      const description = interaction.options.getString('description') ?? '';
      const qualityTags = interaction.options.getString('quality') ?? '';
      const negativeTags = interaction.options.getString('negative') ?? '';

      const idError = validatePresetId(id);
      if (idError) {
        await interaction.editReply({ content: `❌ ${idError}` });
        return;
      }

      if (name.trim().length === 0) {
        await interaction.editReply({ content: '❌ name 不能为空' });
        return;
      }

      const preset = upsertPresetNormalized({
        id,
        name,
        description,
        qualityTags,
        negativeTags,
      });

      const embed = new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle('✅ 已保存预设')
        .addFields(
          { name: 'ID', value: preset.id, inline: true },
          { name: '名称', value: preset.name, inline: true },
          { name: '描述', value: preset.description || '（无）' },
          {
            name: 'Quality（已格式化）',
            value: preset.qualityTags || '（空）',
          },
          {
            name: 'Negative（已格式化）',
            value: preset.negativeTags || '（空）',
          },
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (subcommand === 'preset_delete') {
      const id = interaction.options.getString('id', true);
      const idError = validatePresetId(id);
      if (idError) {
        await interaction.editReply({ content: `❌ ${idError}` });
        return;
      }

      const deleted = deletePresetById(id);
      if (!deleted) {
        await interaction.editReply({ content: `⚠️ 未找到预设: ${id}` });
        return;
      }

      await interaction.editReply({ content: `✅ 已删除预设: ${id}` });
      return;
    }

    await interaction.editReply({
      content: '❌ 未知子命令',
    });
  },
};
