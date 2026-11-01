import { Interaction } from 'discord.js';
import { createScopedLogger } from '@rainfall/shared';
import type { RainfallClient } from '../client/RainfallClient';
import type { CommandRegistry } from '../commands/CommandRegistry';

const log = createScopedLogger('InteractionCreate');

export async function onInteractionCreate(
  interaction: Interaction,
  client: RainfallClient,
  registry: CommandRegistry
): Promise<void> {
  try {
    if (interaction.isChatInputCommand()) {
      await registry.handleSlashCommand(interaction);
    } else if (interaction.isAutocomplete()) {
      await registry.handleAutocomplete(interaction);
    } else if (interaction.isButton()) {
      await client.panelInteractionHandler.handleButton(interaction);
    } else if (interaction.isStringSelectMenu()) {
      await client.panelInteractionHandler.handleSelectMenu(interaction);
    }
  } catch (err: unknown) {
    log.error('Unhandled interaction error', err);
  }
}

