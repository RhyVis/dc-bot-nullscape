import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  APIEmbedField,
  AttachmentBuilder,
} from "discord.js";

export const INTERACTION_TASK_TIMEOUT_MS = 120000; // 与 NovelAI 请求超时保持一致

export interface PlaceholderInitOptions {
  title: string;
  description?: string;
  fields?: APIEmbedField[];
}

export interface PlaceholderProgressOptions {
  title?: string;
  description?: string;
  fields?: APIEmbedField[];
}

export interface PlaceholderSuccessOptions {
  title?: string;
  description?: string;
  fields?: APIEmbedField[];
  files?: AttachmentBuilder[];
}

export interface PlaceholderHandle {
  updateProgress(options: PlaceholderProgressOptions): Promise<void>;
  updateSuccess(options: PlaceholderSuccessOptions): Promise<void>;
  updateError(message: string): Promise<void>;
}

/**
 * 创建一个标准化的占位 Embed，并返回用于更新进度/成功/失败的句柄
 */
export async function createPlaceholder(
  interaction: ChatInputCommandInteraction,
  options: PlaceholderInitOptions
): Promise<PlaceholderHandle> {
  const embed = new EmbedBuilder().setColor(0x7289da).setTitle(options.title);

  if (options.description) {
    embed.setDescription(options.description);
  }

  if (options.fields && options.fields.length > 0) {
    embed.addFields(...options.fields);
  }

  await interaction.editReply({
    content: null,
    embeds: [embed],
  });

  async function updateProgress(
    progress: PlaceholderProgressOptions
  ): Promise<void> {
    if (progress.title) {
      embed.setTitle(progress.title);
    }
    if (progress.description !== undefined) {
      embed.setDescription(progress.description);
    }
    if (progress.fields) {
      embed.setFields(progress.fields);
    }

    await interaction.editReply({
      content: null,
      embeds: [embed],
    });
  }

  async function updateSuccess(
    success: PlaceholderSuccessOptions
  ): Promise<void> {
    if (success.title) {
      embed.setTitle(success.title);
    }
    if (success.description !== undefined) {
      embed.setDescription(success.description);
    }
    if (success.fields) {
      embed.setFields(success.fields);
    }

    embed.setColor(0x57f287); // 成功绿色

    await interaction.editReply({
      content: null,
      embeds: [embed],
      files: success.files,
    });
  }

  async function updateError(message: string): Promise<void> {
    const errorEmbed = new EmbedBuilder()
      .setColor(0xed4245)
      .setTitle("❌ 操作失败")
      .setDescription(message);

    await interaction.editReply({
      content: null,
      embeds: [errorEmbed],
    });
  }

  return {
    updateProgress,
    updateSuccess,
    updateError,
  };
}

/**
 * 为耗时任务提供统一的超时包装
 */
export async function runWithInteractionTimeout<T>(
  task: Promise<T>,
  timeoutMs: number = INTERACTION_TASK_TIMEOUT_MS
): Promise<T> {
  let timeoutHandle: NodeJS.Timeout | null = null;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error("请求超时，请稍后重试"));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([task, timeoutPromise]);
    return result as T;
  } finally {
    if (timeoutHandle !== null) {
      clearTimeout(timeoutHandle);
    }
  }
}
