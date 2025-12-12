import { config } from '../core/config.js';

export function isAdminUser(userId: string): boolean {
  return config.discord.adminIds.includes(userId);
}
