import { REST, Routes } from "discord.js";
import { config } from "./utils/config.js";
import { logger } from "./utils/logger.js";
import { draw, imagine, translate, settings } from "./commands/index.js";

const commands = [
  draw.data.toJSON(),
  imagine.data.toJSON(),
  translate.data.toJSON(),
  settings.data.toJSON(),
];

const rest = new REST({ version: "10" }).setToken(config.discord.token);

async function deployCommands(): Promise<void> {
  try {
    logger.info("Started refreshing application (/) commands...");

    await rest.put(Routes.applicationCommands(config.discord.clientId), {
      body: commands,
    });

    logger.info("Successfully reloaded application (/) commands!", {
      commands: commands.map((c) => c.name),
    });
  } catch (error) {
    logger.error("Failed to deploy commands", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    process.exit(1);
  }
}

deployCommands();
