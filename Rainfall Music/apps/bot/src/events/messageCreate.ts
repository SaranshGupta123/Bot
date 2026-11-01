import { Message } from 'discord.js';
import { createScopedLogger } from '@rainfall/shared';
import type { RainfallClient } from '../client/RainfallClient';
import type { CommandRegistry } from '../commands/CommandRegistry';

const log = createScopedLogger('MessageCreate');

export async function onMessageCreate(
  message: Message,
  client: RainfallClient,
  registry: CommandRegistry
): Promise<void> {
  try {
    await registry.handlePrefixCommand(message);
  } catch (err: unknown) {
    log.error('Error dispatching prefix message command', err);
  }
}

