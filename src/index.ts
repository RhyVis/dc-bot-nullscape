import { Client, GatewayIntentBits } from "discord.js";
import { config } from "./utils/config.js";
import { logger } from "./utils/logger.js";
import * as events from "./events/index.js";
import { initSettings } from "./services/settingsService.js";

// 创建 Discord 客户端
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

// 注册事件处理器
client.once(events.ready.name, (...args) => events.ready.execute(...args));
client.on(events.interactionCreate.name, (...args) =>
  events.interactionCreate.execute(...args)
);

// 启动 Bot
async function main(): Promise<void> {
  try {
    logger.info("Starting bot...");
    await initSettings();
    await client.login(config.discord.token);
  } catch (error) {
    logger.error("Failed to start bot", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    process.exit(1);
  }
}

main();
