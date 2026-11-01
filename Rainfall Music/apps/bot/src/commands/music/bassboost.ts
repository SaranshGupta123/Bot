import { SlashCommandBuilder } from 'discord.js';
import { CommandCategory, AudioFilter } from '@rainfall/types';
import { BaseCommand } from '../BaseCommand';
import { CommandContext } from '../CommandContext';
import type { RainfallClient } from '../../client/RainfallClient';

export class BassboostCommand extends BaseCommand {
  constructor() {
    super({
      name: 'bassboost',
      description: 'Toggle or set bassboost audio filter',
      category: CommandCategory.MUSIC,
      aliases: ['bb', 'bass'],
      requireVoice: true,
      requireSameVoice: true,
      requireQueue: true,
      slashBuilder: new SlashCommandBuilder()
        .setName('bassboost')
        .setDescription('Toggle or set bassboost filter')
        .addStringOption((opt) =>
          opt
            .setName('level')
            .setDescription('Bassboost level')
            .setRequired(false)
            .addChoices(
              { name: 'Enable Bassboost', value: 'bassboost' },
              { name: 'Disable / Clear', value: 'clear' }
            )
        ),
    });
  }

  public async execute(ctx: CommandContext, client: RainfallClient): Promise<any> {
    const player = client.musicManager.getPlayer(ctx.guild.id);
    if (!player) return ctx.sendError('No Player', 'No active music player in this server.');

    const arg = ctx.getString('level') || ctx.args[0]?.toLowerCase();
    const shouldDisable = arg === 'off' || arg === 'clear' || arg === 'disable' || arg === '0';
    const filterToApply = shouldDisable ? AudioFilter.CLEAR : AudioFilter.BASSBOOST;

    await ctx.defer();
    await client.musicManager.applyFilter(player, filterToApply);

    if (shouldDisable) {
      await ctx.sendSuccess('Bassboost Disabled 🎛️', 'Bassboost has been turned off.');
    } else {
      await ctx.sendSuccess('Bassboost Activated 🔊', 'Deep dynamic bass boost has been applied to audio playback.');
    }

    await client.panelManager.updatePanel(ctx.guild.id, true);
  }
}
