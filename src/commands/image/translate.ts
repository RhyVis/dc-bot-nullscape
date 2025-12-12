import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from 'discord.js';
import { Command } from '../../types/commands.js';
import { translateToTags } from '../../infra/llm.js';
import { logger } from '../../core/logger.js';
import {
  createPlaceholder,
  runWithInteractionTimeout,
} from '../../utils/interactionPlaceholder.js';
import { formatDuration } from '../../utils/duration.js';

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName('translate')
    .setDescription('将自然语言描述翻译为 NovelAI 风格的英文标签')
    .addStringOption((option) =>
      option
        .setName('description')
        .setDescription('用自然语言描述你想要的图片')
        .setRequired(true),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const startedAt = Date.now();

    const description = interaction.options.getString('description', true);

    try {
      const displayDescription =
        description.length > 1000
          ? description.substring(0, 1000) + '...'
          : description;

      const placeholder = await createPlaceholder(interaction, {
        title: '🔄 正在翻译描述...',
        fields: [
          {
            name: '📝 原始描述',
            value: displayDescription,
          },
          {
            name: '👤 用户',
            value: `<@${interaction.user.id}>`,
          },
        ],
      });

      const result = await runWithInteractionTimeout(
        translateToTags(description),
      );

      const durationText = formatDuration(Date.now() - startedAt);

      await placeholder.updateSuccess({
        title: '🔄 Tag 翻译结果',
        fields: [
          {
            name: '📝 原始描述',
            value: displayDescription,
          },
          {
            name: '🏷️ 场景标签',
            value: `\`\`\`\n${result.tags}\n\`\`\``,
          },
          {
            name: '✨ 带强调标签 (用于 /draw)',
            value: `\`\`\`\n${result.tagsWithEmphasis}\n\`\`\``,
          },
          {
            name: '👤 用户',
            value: `<@${interaction.user.id}>`,
          },
          {
            name: '⏱ 耗时',
            value: durationText,
          },
        ],
      });

      logger.logTranslation({
        userId: interaction.user.id,
        username: interaction.user.username,
        input: description,
        output: result.tagsWithEmphasis,
        success: true,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      await interaction.editReply({
        content: null,
        embeds: [
          new EmbedBuilder()
            .setColor(0xed4245)
            .setTitle('❌ 翻译失败')
            .setDescription(errorMessage),
        ],
      });

      logger.logTranslation({
        userId: interaction.user.id,
        username: interaction.user.username,
        input: description,
        output: '',
        success: false,
        error: errorMessage,
      });
    }
  },
};
