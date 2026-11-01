import { SlashCommandBuilder } from 'discord.js';
import { CommandCategory, AudioFilter } from '@rainfall/types';
import { BaseCommand } from '../BaseCommand';
import { CommandContext } from '../CommandContext';
import type { RainfallClient } from '../../client/RainfallClient';

export class FilterCommand extends BaseCommand {
  constructor() {
    super({
      name: 'filter',
      description: 'Apply or clear real-time DSP audio filters',
      category: CommandCategory.MUSIC,
      requireVoice: true,
      requireSameVoice: true,
      requireQueue: true,
      slashBuilder: new SlashCommandBuilder()
        .setName('filter')
        .setDescription('Apply real-time audio filters')
        .addStringOption((opt) =>
          opt
            .setName('preset')
            .setDescription('Audio filter preset')
            .setRequired(true)
            .addChoices(
              { name: 'Clear All Filters', value: 'clear' },
              { name: 'Bassboost', value: 'bassboost' },
              { name: 'Nightcore', value: 'nightcore' },
              { name: 'Vaporwave', value: 'vaporwave' },
              { name: '8D Audio', value: '8d' },
              { name: 'Karaoke', value: 'karaoke' },
              { name: 'Tremolo', value: 'tremolo' },
              { name: 'Vibrato', value: 'vibrato' },
              { name: 'Low Pass', value: 'lowpass' }
            )
        ),
    });
  }

  public async execute(ctx: CommandContext, client: RainfallClient): Promise<any> {
    const player = client.musicManager.getPlayer(ctx.guild.id);
    if (!player) return ctx.sendError('No Player', 'No active music player in this server.');

    const preset = ctx.getString('preset') as AudioFilter;
    if (!preset) return ctx.sendError('Preset Required', 'Please choose a filter preset.');

    await ctx.defer();
    await client.musicManager.applyFilter(player, preset);

    await ctx.sendSuccess('Audio Filter Applied 🎛️', `Filter preset **${preset.toUpperCase()}** has been updated.`);
    await client.panelManager.updatePanel(ctx.guild.id, true);
  }
}

