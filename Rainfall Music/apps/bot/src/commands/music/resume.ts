import { SlashCommandBuilder } from 'discord.js';
import { CommandCategory } from '@rainfall/types';
import { BaseCommand } from '../BaseCommand';
import { CommandContext } from '../CommandContext';
import type { RainfallClient } from '../../client/RainfallClient';

export class ResumeCommand extends BaseCommand {
  constructor() {
    super({
      name: 'resume',
      description: 'Resume paused audio playback',
      category: CommandCategory.MUSIC,
      requireVoice: true,
      requireSameVoice: true,
      requireQueue: true,
      slashBuilder: new SlashCommandBuilder()
        .setName('resume')
        .setDescription('Resume paused audio playback'),
    });
  }

  public async execute(ctx: CommandContext, client: RainfallClient): Promise<any> {
    const player = client.musicManager.getPlayer(ctx.guild.id);
    if (!player) return ctx.sendError('No Player', 'No active music player in this server.');

    if (!player.paused) {
      return ctx.sendError('Not Paused', 'The player is already playing!');
    }

    await player.resume();
    await ctx.sendSuccess('Playback Resumed ▶️', 'Audio stream resumed.');
    await client.panelManager.updatePanel(ctx.guild.id, true);
  }
}

