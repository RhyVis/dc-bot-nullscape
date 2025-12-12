import './bootstrap/loadEnv.js';

import { Client, GatewayIntentBits } from 'discord.js';
import { config } from './core/config.js';
import { logger } from './core/logger.js';
import * as ready from './events/ready.js';
import * as interactionCreate from './events/interactionCreate.js';
import { initSettings } from './core/settings/settingsService.js';

// 创建 Discord 客户端
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

// 注册事件处理器
client.once(ready.name, (...args) => ready.execute(...args));
client.on(interactionCreate.name, (...args) =>
  interactionCreate.execute(...args),
);

// 启动 Bot
async function main(): Promise<void> {
  try {
    logger.info('Starting bot...');
    await initSettings();
    await client.login(config.discord.token);
  } catch (error) {
    logger.error('Failed to start bot', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    process.exit(1);
  }
}

main();
