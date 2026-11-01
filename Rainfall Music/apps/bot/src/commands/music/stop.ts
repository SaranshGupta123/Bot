import { SlashCommandBuilder } from 'discord.js';
import { CommandCategory } from '@rainfall/types';
import { BaseCommand } from '../BaseCommand';
import { CommandContext } from '../CommandContext';
import type { RainfallClient } from '../../client/RainfallClient';

export class StopCommand extends BaseCommand {
  constructor() {
    super({
      name: 'stop',
      description: 'Stop playback, clear the queue, and leave the voice channel',
      category: CommandCategory.MUSIC,
      requireVoice: true,
      requireSameVoice: true,
      requireQueue: true,
      slashBuilder: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Stop audio playback and clear the queue'),
    });
  }

  public async execute(ctx: CommandContext, client: RainfallClient): Promise<any> {
    const player = client.musicManager.getPlayer(ctx.guild.id);
    if (!player) return ctx.sendError('No Player', 'No active music player in this server.');

    await player.destroy();
    await ctx.sendSuccess('Playback Stopped ⏹️', 'Audio player destroyed and queue cleared.');
  }
}

