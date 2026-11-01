import { SlashCommandBuilder } from 'discord.js';
import { CommandCategory } from '@rainfall/types';
import { BaseCommand } from '../BaseCommand';
import { CommandContext } from '../CommandContext';
import type { RainfallClient } from '../../client/RainfallClient';

export class PreviousCommand extends BaseCommand {
  constructor() {
    super({
      name: 'previous',
      description: 'Replay the previously played track from queue history',
      category: CommandCategory.MUSIC,
      aliases: ['prev', 'back'],
      requireVoice: true,
      requireSameVoice: true,
      slashBuilder: new SlashCommandBuilder()
        .setName('previous')
        .setDescription('Replay the previously played track'),
    });
  }

  public async execute(ctx: CommandContext, client: RainfallClient): Promise<any> {
    const player = client.musicManager.getPlayer(ctx.guild.id);
    if (!player) return ctx.sendError('No Player', 'No active music player in this server.');

    if (!player.queue.previous || player.queue.previous.length === 0) {
      return ctx.sendError('No Previous Track', 'There is no playback history to return to.');
    }

    const prevTrack = player.queue.previous.shift();
    if (!prevTrack) {
      return ctx.sendError('No Previous Track', 'Could not retrieve previous track.');
    }

    await player.queue.add(prevTrack, 0);
    await player.skip();

    await ctx.sendSuccess('Returning to Previous Track ⏮️', `Now playing **${prevTrack.info.title}**.`);
    await client.panelManager.updatePanel(ctx.guild.id, true, true);
  }
}

