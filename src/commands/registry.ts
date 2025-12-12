import type { Command } from '../types/commands.js';

import { command as draw } from './image/draw.js';
import { command as imagine } from './image/imagine.js';
import { command as translate } from './image/translate.js';
import { command as settings } from './admin/settings.js';

export const commandList = [
  draw,
  imagine,
  translate,
  settings,
] as const satisfies readonly Command[];

function getCommandName(command: Command): string {
  const json = command.data.toJSON() as { name?: unknown };
  if (typeof json.name !== 'string' || json.name.length === 0) {
    throw new Error('Command is missing a valid name');
  }
  return json.name;
}

export const commandMap = new Map<string, Command>(
  commandList.map((command) => [getCommandName(command), command]),
);

export const commandJSON = commandList.map((command) => command.data.toJSON());
