import { SlashCommandBuilder } from 'discord.js';
import { CommandCategory } from '@rainfall/types';
import { BaseCommand } from '../BaseCommand';
import { CommandContext } from '../CommandContext';
import type { RainfallClient } from '../../client/RainfallClient';

export class SkipCommand extends BaseCommand {
  constructor() {
    super({
      name: 'skip',
      description: 'Skip the current track or to a specific position in the queue',
      category: CommandCategory.MUSIC,
      aliases: ['s', 'next'],
      requireVoice: true,
      requireSameVoice: true,
      requireQueue: true,
      slashBuilder: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Skip the current track')
        .addIntegerOption((opt) =>
          opt
            .setName('amount')
            .setDescription('Number of tracks to skip forward')
            .setMinValue(1)
        ),
    });
  }

  public async execute(ctx: CommandContext, client: RainfallClient): Promise<any> {
    const player = client.musicManager.getPlayer(ctx.guild.id);
    if (!player) return ctx.sendError('No Player', 'No active music player in this server.');

    const amount = ctx.getInteger('amount') || 1;
    const currentTitle = player.queue.current?.info.title || 'Current track';

    if (amount > 1) {
      await player.skip(amount);
      await ctx.sendSuccess('Skipped Tracks ⏭️', `Skipped **${amount}** tracks forward.`);
    } else {
      await player.skip();
      await ctx.sendSuccess('Skipped Track ⏭️', `Skipped **${currentTitle}**.`);
    }

    await client.panelManager.updatePanel(ctx.guild.id, true, true);
  }
}

