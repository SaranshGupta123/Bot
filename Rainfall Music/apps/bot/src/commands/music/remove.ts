import { SlashCommandBuilder } from 'discord.js';
import { CommandCategory } from '@rainfall/types';
import { BaseCommand } from '../BaseCommand';
import { CommandContext } from '../CommandContext';
import type { RainfallClient } from '../../client/RainfallClient';

export class RemoveCommand extends BaseCommand {
  constructor() {
    super({
      name: 'remove',
      description: 'Remove a specific track from the queue by its index position',
      category: CommandCategory.MUSIC,
      requireVoice: true,
      requireSameVoice: true,
      requireQueue: true,
      slashBuilder: new SlashCommandBuilder()
        .setName('remove')
        .setDescription('Remove a track from the queue')
        .addIntegerOption((opt) =>
          opt
            .setName('position')
            .setDescription('Queue index of the track to remove')
            .setRequired(true)
            .setMinValue(1)
        ),
    });
  }

  public async execute(ctx: CommandContext, client: RainfallClient): Promise<any> {
    const player = client.musicManager.getPlayer(ctx.guild.id);
    if (!player) return ctx.sendError('No Player', 'No active music player in this server.');

    const pos = ctx.getInteger('position');
    if (!pos || pos < 1 || pos > player.queue.tracks.length) {
      return ctx.sendError('Invalid Position', `Position must be between 1 and ${player.queue.tracks.length}.`);
    }

    const removed = player.queue.remove(pos - 1);
    const title = removed && (removed as any).info ? (removed as any).info.title : `Track #${pos}`;

    await ctx.sendSuccess('Track Removed 🗑️', `Removed **${title}** from the queue.`);
    await client.panelManager.updatePanel(ctx.guild.id, true);
  }
}

