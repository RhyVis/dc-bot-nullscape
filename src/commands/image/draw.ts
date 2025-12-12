import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  AutocompleteInteraction,
  AttachmentBuilder,
  EmbedBuilder,
} from 'discord.js';
import { Command } from '../../types/commands.js';
import {
  NAI_MODELS,
  NAI_SAMPLERS,
  NAIModelId,
  NAISampler,
  SIZE_PRESETS,
  MODEL_DEFAULTS,
} from '../../types/novelai.js';
import {
  getPreset,
  searchPresetSummaries,
} from '../../core/presets/presetsService.js';
import { generateImage } from '../../infra/novelai.js';
import { buildFinalPrompt } from '../../domain/prompt.js';
import { logger } from '../../core/logger.js';
import {
  createPlaceholder,
  runWithInteractionTimeout,
} from '../../utils/interactionPlaceholder.js';
import { applyLimitModeToSize } from '../../core/limitMode.js';
import { formatDuration } from '../../utils/duration.js';

// 构建模型选项
const modelChoices = Object.entries(NAI_MODELS).map(([value, name]) => ({
  name,
  value,
}));

// 构建采样器选项
const samplerChoices = NAI_SAMPLERS.map((sampler) => ({
  name: sampler,
  value: sampler,
}));

// 构建尺寸预设选项
const sizeChoices = Object.entries(SIZE_PRESETS).map(([value, preset]) => ({
  name: preset.name,
  value,
}));

function truncateChoiceName(name: string, max = 100): string {
  if (name.length <= max) return name;
  return name.slice(0, Math.max(0, max - 1)) + '…';
}

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName('draw')
    .setDescription('使用 NovelAI 生成图片 (支持预设风格)')
    .addStringOption((option) =>
      option
        .setName('prompt')
        .setDescription('场景描述标签 (英文，使用 <tag:1.5> 格式强调)')
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName('preset')
        .setDescription('风格预设 (包含质量标签和负面提示)')
        .setRequired(false)
        .setAutocomplete(true),
    )
    .addStringOption((option) =>
      option
        .setName('model')
        .setDescription('选择模型')
        .setRequired(false)
        .addChoices(...modelChoices),
    )
    .addStringOption((option) =>
      option
        .setName('size')
        .setDescription('图片尺寸')
        .setRequired(false)
        .addChoices(...sizeChoices),
    )
    .addStringOption((option) =>
      option
        .setName('negative')
        .setDescription('额外负向提示词 (会与预设合并)')
        .setRequired(false),
    )
    .addStringOption((option) =>
      option
        .setName('sampler')
        .setDescription('采样器')
        .setRequired(false)
        .addChoices(...samplerChoices),
    )
    .addIntegerOption((option) =>
      option
        .setName('steps')
        .setDescription('采样步数 (1-50)')
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(50),
    )
    .addNumberOption((option) =>
      option
        .setName('scale')
        .setDescription('CFG Scale (1-10)')
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(10),
    )
    .addIntegerOption((option) =>
      option
        .setName('seed')
        .setDescription('随机种子 (留空则随机)')
        .setRequired(false)
        .setMinValue(0)
        .setMaxValue(4294967295),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    // 立即延迟回复，防止 Discord 交互超时
    await interaction.deferReply();

    const startedAt = Date.now();

    const prompt = interaction.options.getString('prompt', true);
    const presetId = interaction.options.getString('preset') ?? undefined;
    const model = (interaction.options.getString('model') ??
      'nai-diffusion-4-full') as NAIModelId;
    const sizePreset = (interaction.options.getString('size') ??
      'portrait_small') as keyof typeof SIZE_PRESETS;
    const userNegative = interaction.options.getString('negative') ?? undefined;
    const sampler = interaction.options.getString(
      'sampler',
    ) as NAISampler | null;
    const steps = interaction.options.getInteger('steps');
    const scale = interaction.options.getNumber('scale');
    const seed = interaction.options.getInteger('seed') ?? undefined;

    try {
      // 获取预设（可选；未指定或不存在则按“无预设”处理）
      const preset = presetId ? getPreset(presetId) : null;
      const presetDisplay = preset
        ? preset.name
        : presetId
          ? `（未找到: ${presetId}）`
          : '（无）';

      // 获取模型默认值
      const modelDefaults =
        MODEL_DEFAULTS[model] ?? MODEL_DEFAULTS['nai-diffusion-4-full'];

      // 解析尺寸预设
      const size =
        SIZE_PRESETS[sizePreset as keyof typeof SIZE_PRESETS] ??
        SIZE_PRESETS.portrait;
      const limitedSize = applyLimitModeToSize(
        size.width,
        size.height,
        String(sizePreset),
      );
      const { width, height } = limitedSize;

      // 组装最终提示词
      const finalPrompt = buildFinalPrompt({
        scenePrompt: prompt,
        userNegative,
        preset: preset ?? undefined,
        model,
      });

      // 截断显示的 prompt 供占位与展示使用
      const displayPrompt =
        finalPrompt.positive.length > 150
          ? finalPrompt.positive.substring(0, 150) + '...'
          : finalPrompt.positive;

      // 创建占位 embed
      const placeholder = await createPlaceholder(interaction, {
        title: '🎨 正在生成图片...',
        fields: [
          {
            name: '📝 Prompt',
            value: `\`${displayPrompt}\``,
          },
          {
            name: '🎭 预设',
            value: presetDisplay,
          },
          {
            name: '🎨 模型',
            value: NAI_MODELS[model],
          },
          {
            name: '📐 尺寸',
            value: `${width}x${height}`,
          },
          {
            name: '👤 用户',
            value: `<@${interaction.user.id}>`,
          },
          ...(limitedSize.limited
            ? [
                {
                  name: '⛔ 限制模式',
                  value: `已从 ${limitedSize.originalWidth}x${limitedSize.originalHeight} 调整为 ${width}x${height}`,
                },
              ]
            : []),
        ],
      });

      const result = await runWithInteractionTimeout(
        generateImage({
          prompt: finalPrompt.positive,
          negative_prompt: finalPrompt.negative || undefined,
          model,
          width,
          height,
          steps: steps ?? modelDefaults.steps,
          scale: scale ?? modelDefaults.scale,
          sampler: sampler ?? modelDefaults.sampler,
          seed,
        }),
      );

      const attachmentName = `draw_${result.seed}.png`;

      // 创建附件
      const attachment = new AttachmentBuilder(result.buffer, {
        name: attachmentName,
      });

      const durationText = formatDuration(Date.now() - startedAt);

      await placeholder.updateSuccess({
        title: '✨ 生成完成',
        fields: [
          {
            name: '📝 Prompt',
            value: `\`${displayPrompt}\``,
          },
          {
            name: '🎭 预设',
            value: finalPrompt.presetName,
          },
          {
            name: '🎨 模型',
            value: NAI_MODELS[model],
          },
          {
            name: '🌱 Seed',
            value: `\`${result.seed}\``,
          },
          {
            name: '📐 尺寸',
            value: `${width}x${height}`,
          },
          {
            name: '👤 用户',
            value: `<@${interaction.user.id}>`,
          },
          {
            name: '⏱ 耗时',
            value: durationText,
          },
          ...(limitedSize.limited
            ? [
                {
                  name: '⛔ 限制模式',
                  value: `已从 ${limitedSize.originalWidth}x${limitedSize.originalHeight} 调整为 ${width}x${height}`,
                },
              ]
            : []),
        ],
        files: [attachment],
      });

      // 记录日志
      logger.logGeneration({
        userId: interaction.user.id,
        username: interaction.user.username,
        prompt: finalPrompt.positive,
        model,
        seed: result.seed,
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
            .setTitle('❌ 生成失败')
            .setDescription(errorMessage),
        ],
      });

      logger.logGeneration({
        userId: interaction.user.id,
        username: interaction.user.username,
        prompt: 'err',
        model,
        seed: seed ?? 0,
        success: false,
        error: errorMessage,
      });
    }
  },

  async autocomplete(interaction: AutocompleteInteraction) {
    const focused = interaction.options.getFocused(true);
    if (focused.name !== 'preset') {
      await interaction.respond([]);
      return;
    }

    const query = String(focused.value ?? '');
    const items = searchPresetSummaries(query, 25);

    await interaction.respond(
      items.slice(0, 25).map((p) => ({
        name: truncateChoiceName(`${p.name} (${p.id})`),
        value: p.id,
      })),
    );
  },
};
