import { SlashCommandBuilder } from 'discord.js';
import { CommandCategory } from '@rainfall/types';
import { BaseCommand } from '../BaseCommand';
import { CommandContext } from '../CommandContext';
import type { RainfallClient } from '../../client/RainfallClient';

export class PauseCommand extends BaseCommand {
  constructor() {
    super({
      name: 'pause',
      description: 'Pause the current audio stream',
      category: CommandCategory.MUSIC,
      requireVoice: true,
      requireSameVoice: true,
      requireQueue: true,
      slashBuilder: new SlashCommandBuilder()
        .setName('pause')
        .setDescription('Pause the current audio stream'),
    });
  }

  public async execute(ctx: CommandContext, client: RainfallClient): Promise<any> {
    const player = client.musicManager.getPlayer(ctx.guild.id);
    if (!player) return ctx.sendError('No Player', 'No active music player in this server.');

    if (player.paused) {
      return ctx.sendError('Already Paused', 'The music player is already paused! Use `/resume` to continue.');
    }

    await player.pause();
    await ctx.sendSuccess('Playback Paused ⏸️', 'Audio stream has been paused.');
    await client.panelManager.updatePanel(ctx.guild.id, true);
  }
}

