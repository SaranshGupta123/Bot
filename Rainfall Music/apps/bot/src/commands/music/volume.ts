import { SlashCommandBuilder } from 'discord.js';
import { CommandCategory } from '@rainfall/types';
import { BaseCommand } from '../BaseCommand';
import { CommandContext } from '../CommandContext';
import type { RainfallClient } from '../../client/RainfallClient';

export class VolumeCommand extends BaseCommand {
  constructor() {
    super({
      name: 'volume',
      description: 'Check or adjust playback volume',
      category: CommandCategory.MUSIC,
      aliases: ['vol', 'v'],
      requireVoice: true,
      requireSameVoice: true,
      requireQueue: true,
      slashBuilder: new SlashCommandBuilder()
        .setName('volume')
        .setDescription('Set playback volume (1% - 150%)')
        .addIntegerOption((opt) =>
          opt
            .setName('level')
            .setDescription('Volume level between 1 and 150')
            .setMinValue(1)
            .setMaxValue(150)
            .setRequired(false)
        ),
    });
  }

  public async execute(ctx: CommandContext, client: RainfallClient): Promise<any> {
    const player = client.musicManager.getPlayer(ctx.guild.id);
    if (!player) return ctx.sendError('No Player', 'No active music player in this server.');

    const level = ctx.getInteger('level');

    if (level === null) {
      return ctx.sendInfo('Current Volume 🔊', `The player volume is currently at **${player.volume}%**.`);
    }

    if (level < 1 || level > 150) {
      return ctx.sendError('Invalid Volume', 'Volume must be between **1%** and **150%**.');
    }

    await player.setVolume(level);
    await ctx.sendSuccess('Volume Updated 🔊', `Set player volume to **${level}%**.`);
    await client.panelManager.updatePanel(ctx.guild.id, true);
  }
}

