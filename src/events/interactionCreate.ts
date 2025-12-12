import { Events, Interaction } from 'discord.js';
import { commandMap } from '../commands/registry.js';
import { logger } from '../core/logger.js';
import { rateLimiter } from '../core/rateLimiter.js';
import { getRateLimitPerMin } from '../core/settings/settingsService.js';
import { checkInteractionAccess } from '../auth/accessControl.js';
import { isAdminUser } from '../auth/adminAuth.js';

export const name = Events.InteractionCreate;

export async function execute(interaction: Interaction): Promise<void> {
  if (interaction.isAutocomplete()) {
    const command = commandMap.get(interaction.commandName);

    if (!command) {
      logger.warn('Unknown command received (autocomplete)', {
        commandName: interaction.commandName,
      });
      await interaction.respond([]);
      return;
    }

    if (!command.autocomplete) {
      await interaction.respond([]);
      return;
    }

    try {
      await command.autocomplete(interaction);
    } catch (error) {
      logger.error('Autocomplete handler error', {
        command: interaction.commandName,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      await interaction.respond([]);
    }

    return;
  }

  if (!interaction.isChatInputCommand()) return;

  const command = commandMap.get(interaction.commandName);

  if (!command) {
    logger.warn('Unknown command received', {
      commandName: interaction.commandName,
    });
    return;
  }

  // 服务器/频道访问控制（settings 命令跳过该限制以便配置）
  const access = checkInteractionAccess(interaction);
  if (!access.ok) {
    await interaction.reply({
      content: `❌ ${access.reason}`,
      ephemeral: true,
    });
    return;
  }

  // 全局速率限制（管理员绕过）
  const isAdmin = isAdminUser(interaction.user.id);
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
    logger.info('Executing command', {
      command: interaction.commandName,
      userId: interaction.user.id,
      username: interaction.user.username,
      guildId: interaction.guildId,
    });

    await command.execute(interaction);
  } catch (error) {
    logger.error('Command execution error', {
      command: interaction.commandName,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    const errorMessage = '❌ 执行命令时发生错误';

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: errorMessage, ephemeral: true });
    } else {
      await interaction.reply({ content: errorMessage, ephemeral: true });
    }
  }
}
