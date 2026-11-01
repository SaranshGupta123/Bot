import { SlashCommandBuilder } from 'discord.js';
import { CommandCategory } from '@rainfall/types';
import { BaseCommand } from '../BaseCommand';
import { CommandContext } from '../CommandContext';
import type { RainfallClient } from '../../client/RainfallClient';

export class ClearCommand extends BaseCommand {
  constructor() {
    super({
      name: 'clear',
      description: 'Clear all upcoming tracks from the queue',
      category: CommandCategory.MUSIC,
      requireVoice: true,
      requireSameVoice: true,
      requireQueue: true,
      slashBuilder: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Clear upcoming tracks from the queue'),
    });
  }

  public async execute(ctx: CommandContext, client: RainfallClient): Promise<any> {
    const player = client.musicManager.getPlayer(ctx.guild.id);
    if (!player) return ctx.sendError('No Player', 'No active music player in this server.');

    const count = player.queue.tracks.length;
    player.queue.tracks.splice(0, player.queue.tracks.length);

    await ctx.sendSuccess('Queue Cleared 🗑️', `Removed **${count}** tracks from the upcoming queue.`);
    await client.panelManager.updatePanel(ctx.guild.id, true);
  }
}

