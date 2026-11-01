import { SlashCommandBuilder } from 'discord.js';
import { CommandCategory } from '@rainfall/types';
import { BaseCommand } from '../BaseCommand';
import { CommandContext } from '../CommandContext';
import type { RainfallClient } from '../../client/RainfallClient';

export class JumpCommand extends BaseCommand {
  constructor() {
    super({
      name: 'jump',
      description: 'Skip directly to a specific song in the queue',
      category: CommandCategory.MUSIC,
      aliases: ['skipto'],
      requireVoice: true,
      requireSameVoice: true,
      requireQueue: true,
      slashBuilder: new SlashCommandBuilder()
        .setName('jump')
        .setDescription('Jump directly to track number')
        .addIntegerOption((opt) =>
          opt
            .setName('position')
            .setDescription('Queue index of the track')
            .setRequired(true)
            .setMinValue(1)
        ),
    });
  }

  public async execute(ctx: CommandContext, client: RainfallClient): Promise<any> {
    const player = client.musicManager.getPlayer(ctx.guild.id);
    if (!player) return ctx.sendError('No Player', 'No active music player in this server.');

    const pos = ctx.getInteger('position');
    const queueLen = player.queue.tracks.length;

    if (!pos || pos < 1 || pos > queueLen) {
      return ctx.sendError('Invalid Index', `Please choose an index between 1 and ${queueLen}.`);
    }

    // Skip to index
    await player.skip(pos);
    await ctx.sendSuccess('Jumped to Track ⏭️', `Jumped ahead to track #${pos} in the queue.`);
    await client.panelManager.updatePanel(ctx.guild.id, true);
  }
}

