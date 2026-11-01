import { SlashCommandBuilder } from 'discord.js';
import { CommandCategory, AudioFilter } from '@rainfall/types';
import { BaseCommand } from '../BaseCommand';
import { CommandContext } from '../CommandContext';
import type { RainfallClient } from '../../client/RainfallClient';

export class NightcoreCommand extends BaseCommand {
  constructor() {
    super({
      name: 'nightcore',
      description: 'Toggle nightcore audio filter (higher pitch and tempo)',
      category: CommandCategory.MUSIC,
      aliases: ['nc'],
      requireVoice: true,
      requireSameVoice: true,
      requireQueue: true,
      slashBuilder: new SlashCommandBuilder()
        .setName('nightcore')
        .setDescription('Toggle nightcore filter'),
    });
  }

  public async execute(ctx: CommandContext, client: RainfallClient): Promise<any> {
    const player = client.musicManager.getPlayer(ctx.guild.id);
    if (!player) return ctx.sendError('No Player', 'No active music player in this server.');

    const arg = ctx.args[0]?.toLowerCase();
    const shouldDisable = arg === 'off' || arg === 'clear' || arg === 'disable';
    const filterToApply = shouldDisable ? AudioFilter.CLEAR : AudioFilter.NIGHTCORE;

    await ctx.defer();
    await client.musicManager.applyFilter(player, filterToApply);

    if (shouldDisable) {
      await ctx.sendSuccess('Nightcore Disabled 🎛️', 'Nightcore filter has been removed.');
    } else {
      await ctx.sendSuccess('Nightcore Activated ✨', 'Nightcore tempo and pitch filter is now playing!');
    }

    await client.panelManager.updatePanel(ctx.guild.id, true);
  }
}
