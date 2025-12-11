import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  AttachmentBuilder,
} from "discord.js";
import { Command } from "../../types/commands.js";
import {
  NAI_MODELS,
  NAI_SAMPLERS,
  NAIModelId,
  NAISampler,
  SIZE_PRESETS,
  MODEL_DEFAULTS,
} from "../../types/novelai.js";
import { generateImage } from "../../services/novelai.js";
import { logger } from "../../utils/logger.js";

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

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("nai")
    .setDescription("使用 NovelAI 生成图片")
    .addStringOption((option) =>
      option
        .setName("prompt")
        .setDescription("正向提示词 (英文标签)")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("model")
        .setDescription("选择模型")
        .setRequired(false)
        .addChoices(...modelChoices)
    )
    .addStringOption((option) =>
      option
        .setName("size")
        .setDescription("图片尺寸")
        .setRequired(false)
        .addChoices(...sizeChoices)
    )
    .addStringOption((option) =>
      option.setName("negative").setDescription("负向提示词").setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("sampler")
        .setDescription("采样器")
        .setRequired(false)
        .addChoices(...samplerChoices)
    )
    .addIntegerOption((option) =>
      option
        .setName("steps")
        .setDescription("采样步数 (1-50)")
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(50)
    )
    .addNumberOption((option) =>
      option
        .setName("scale")
        .setDescription("CFG Scale (1-10)")
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(10)
    )
    .addIntegerOption((option) =>
      option
        .setName("seed")
        .setDescription("随机种子 (留空则随机)")
        .setRequired(false)
        .setMinValue(0)
        .setMaxValue(4294967295)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    // 立即延迟回复，防止超时
    await interaction.deferReply();

    const prompt = interaction.options.getString("prompt", true);
    const model = (interaction.options.getString("model") ??
      "nai-diffusion-3") as NAIModelId;
    const sizePreset = interaction.options.getString("size") ?? "portrait";
    const negative_prompt =
      interaction.options.getString("negative") ?? undefined;
    const sampler = interaction.options.getString(
      "sampler"
    ) as NAISampler | null;
    const steps = interaction.options.getInteger("steps");
    const scale = interaction.options.getNumber("scale");
    const seed = interaction.options.getInteger("seed") ?? undefined;

    // 获取模型默认值
    const modelDefaults =
      MODEL_DEFAULTS[model] ?? MODEL_DEFAULTS["nai-diffusion-3"];

    // 解析尺寸预设
    const size =
      SIZE_PRESETS[sizePreset as keyof typeof SIZE_PRESETS] ??
      SIZE_PRESETS.portrait;
    const { width, height } = size;

    try {
      const result = await generateImage({
        prompt,
        negative_prompt,
        model,
        width,
        height,
        steps: steps ?? modelDefaults.steps,
        scale: scale ?? modelDefaults.scale,
        sampler: sampler ?? modelDefaults.sampler,
        seed,
      });

      // 创建附件
      const attachment = new AttachmentBuilder(result.buffer, {
        name: `nai_${result.seed}.png`,
      });

      // 构建回复消息
      const replyContent = [
        `✨ **生成完成**`,
        `📝 **Prompt:** \`${
          prompt.length > 100 ? prompt.substring(0, 100) + "..." : prompt
        }\``,
        `🎨 **Model:** ${NAI_MODELS[model]}`,
        `🌱 **Seed:** \`${result.seed}\``,
        `📐 **Size:** ${width}x${height}`,
      ].join("\n");

      await interaction.editReply({
        content: replyContent,
        files: [attachment],
      });

      // 记录日志
      logger.logGeneration({
        userId: interaction.user.id,
        username: interaction.user.username,
        prompt,
        model,
        seed: result.seed,
        success: true,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      await interaction.editReply({
        content: `❌ **生成失败**\n错误: ${errorMessage}`,
      });

      logger.logGeneration({
        userId: interaction.user.id,
        username: interaction.user.username,
        prompt,
        model,
        seed: seed ?? 0,
        success: false,
        error: errorMessage,
      });
    }
  },
};
