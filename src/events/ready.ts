import { Events, Client } from 'discord.js';
import { logger } from '../core/logger.js';

export const name = Events.ClientReady;
export const once = true;

export async function execute(client: Client<true>): Promise<void> {
  logger.info('Bot is ready!', {
    username: client.user.tag,
    guilds: client.guilds.cache.size,
  });
}
