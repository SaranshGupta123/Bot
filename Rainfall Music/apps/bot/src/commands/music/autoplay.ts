import { SlashCommandBuilder } from 'discord.js';
import { CommandCategory } from '@rainfall/types';
import { BaseCommand } from '../BaseCommand';
import { CommandContext } from '../CommandContext';
import type { RainfallClient } from '../../client/RainfallClient';

export class AutoplayCommand extends BaseCommand {
  constructor() {
    super({
      name: 'autoplay',
      description: 'Toggle smart autoplay to play related music when the queue runs out',
      category: CommandCategory.MUSIC,
      requireVoice: true,
      requireSameVoice: true,
      slashBuilder: new SlashCommandBuilder()
        .setName('autoplay')
        .setDescription('Toggle smart autoplay'),
    });
  }

  public async execute(ctx: CommandContext, client: RainfallClient): Promise<any> {
    const player = client.musicManager.getPlayer(ctx.guild.id);
    if (!player) return ctx.sendError('No Player', 'No active music player in this server.');

    const current = player.get<boolean>('autoplay') || false;
    const nextState = !current;
    player.set('autoplay', nextState);

    await ctx.sendSuccess(
      'Smart Autoplay 📻',
      `Autoplay has been **${nextState ? 'ENABLED' : 'DISABLED'}**. Related songs will ${nextState ? 'automatically be queued' : 'no longer be queued'} when the queue finishes.`
    );
    await client.panelManager.updatePanel(ctx.guild.id, true);
  }
}

