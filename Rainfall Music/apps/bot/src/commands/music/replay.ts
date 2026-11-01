import { SlashCommandBuilder } from 'discord.js';
import { CommandCategory } from '@rainfall/types';
import { BaseCommand } from '../BaseCommand';
import { CommandContext } from '../CommandContext';
import type { RainfallClient } from '../../client/RainfallClient';

export class ReplayCommand extends BaseCommand {
  constructor() {
    super({
      name: 'replay',
      description: 'Replay the current song from the beginning',
      category: CommandCategory.MUSIC,
      requireVoice: true,
      requireSameVoice: true,
      requireQueue: true,
      slashBuilder: new SlashCommandBuilder()
        .setName('replay')
        .setDescription('Restart current song from 0:00'),
    });
  }

  public async execute(ctx: CommandContext, client: RainfallClient): Promise<any> {
    const player = client.musicManager.getPlayer(ctx.guild.id);
    if (!player || !player.queue.current) return ctx.sendError('No Player', 'No active track to replay.');

    await player.seek(0);
    await ctx.sendSuccess('Replaying Track 🔄', `Restarted **${player.queue.current.info.title}** from the beginning.`);
    await client.panelManager.updatePanel(ctx.guild.id, true);
  }
}

