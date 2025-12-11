import { Events, Interaction } from "discord.js";
import { draw, imagine, translate, settings } from "../commands/index.js";
import { logger } from "../utils/logger.js";
import { config } from "../utils/config.js";
import { rateLimiter } from "../utils/rateLimiter.js";
import { getRateLimitPerMin } from "../services/settingsService.js";
import { Command } from "../types/commands.js";

// 命令映射
const commands = new Map<string, Command>([
  ["draw", { data: draw.data, execute: draw.execute }],
  ["imagine", { data: imagine.data, execute: imagine.execute }],
  ["translate", { data: translate.data, execute: translate.execute }],
  ["settings", { data: settings.data, execute: settings.execute }],
]);

export const name = Events.InteractionCreate;

export async function execute(interaction: Interaction): Promise<void> {
  if (!interaction.isChatInputCommand()) return;

  const command = commands.get(interaction.commandName);

  if (!command) {
    logger.warn("Unknown command received", {
      commandName: interaction.commandName,
    });
    return;
  }

  // 全局速率限制（管理员绕过）
  const isAdmin = config.discord.adminIds.includes(interaction.user.id);
  const rateLimitResult = rateLimiter.checkAndConsume({
    userId: interaction.user.id,
    command: interaction.commandName,
    isAdmin,
  });

  if (!rateLimitResult.allowed) {
    const waitSeconds = Math.ceil((rateLimitResult.retryAfterMs ?? 0) / 1000);
    const limit = getRateLimitPerMin();

    await interaction.reply({
      content: `⚠️ **速率限制**: 每分钟最多 ${limit} 次，请在 ${waitSeconds} 秒后重试。`,
      ephemeral: true,
    });
    return;
  }

  try {
    logger.info("Executing command", {
      command: interaction.commandName,
      userId: interaction.user.id,
      username: interaction.user.username,
      guildId: interaction.guildId,
    });

    await command.execute(interaction);
  } catch (error) {
    logger.error("Command execution error", {
      command: interaction.commandName,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    const errorMessage = "❌ 执行命令时发生错误";

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: errorMessage, ephemeral: true });
    } else {
      await interaction.reply({ content: errorMessage, ephemeral: true });
    }
  }
}
