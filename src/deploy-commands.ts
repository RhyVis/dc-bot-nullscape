import './bootstrap/loadEnv.js';

import { REST, Routes } from 'discord.js';
import { config } from './core/config.js';
import { logger } from './core/logger.js';
import { commandJSON } from './commands/registry.js';

const rest = new REST({ version: '10' }).setToken(config.discord.token);

async function deployCommands(): Promise<void> {
  try {
    logger.info('Started refreshing application (/) commands...');

    await rest.put(Routes.applicationCommands(config.discord.clientId), {
      body: commandJSON,
    });

    logger.info('Successfully reloaded application (/) commands!', {
      commands: commandJSON.map((c: any) => c?.name).filter(Boolean),
    });
  } catch (error) {
    logger.error('Failed to deploy commands', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    process.exit(1);
  }
}

deployCommands();
