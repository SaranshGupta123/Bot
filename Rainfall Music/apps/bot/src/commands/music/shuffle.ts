import { SlashCommandBuilder } from 'discord.js';
import { CommandCategory } from '@rainfall/types';
import { BaseCommand } from '../BaseCommand';
import { CommandContext } from '../CommandContext';
import type { RainfallClient } from '../../client/RainfallClient';

export class ShuffleCommand extends BaseCommand {
  constructor() {
    super({
      name: 'shuffle',
      description: 'Randomize the order of tracks in the queue',
      category: CommandCategory.MUSIC,
      requireVoice: true,
      requireSameVoice: true,
      requireQueue: true,
      slashBuilder: new SlashCommandBuilder()
        .setName('shuffle')
        .setDescription('Shuffle the upcoming music queue'),
    });
  }

  public async execute(ctx: CommandContext, client: RainfallClient): Promise<any> {
    const player = client.musicManager.getPlayer(ctx.guild.id);
    if (!player) return ctx.sendError('No Player', 'No active music player in this server.');

    if (player.queue.tracks.length <= 1) {
      return ctx.sendError('Not Enough Tracks', 'You need at least 2 tracks in queue to shuffle.');
    }

    player.queue.shuffle();
    await ctx.sendSuccess('Queue Shuffled 🔀', `Randomized the order of **${player.queue.tracks.length}** tracks.`);
    await client.panelManager.updatePanel(ctx.guild.id, true);
  }
}

