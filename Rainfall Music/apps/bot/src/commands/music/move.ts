import { SlashCommandBuilder } from 'discord.js';
import { CommandCategory } from '@rainfall/types';
import { BaseCommand } from '../BaseCommand';
import { CommandContext } from '../CommandContext';
import type { RainfallClient } from '../../client/RainfallClient';

export class MoveCommand extends BaseCommand {
  constructor() {
    super({
      name: 'move',
      description: 'Move a track to a different position in the queue',
      category: CommandCategory.MUSIC,
      requireVoice: true,
      requireSameVoice: true,
      requireQueue: true,
      slashBuilder: new SlashCommandBuilder()
        .setName('move')
        .setDescription('Move track position')
        .addIntegerOption((opt) =>
          opt
            .setName('from')
            .setDescription('Current track position')
            .setRequired(true)
            .setMinValue(1)
        )
        .addIntegerOption((opt) =>
          opt
            .setName('to')
            .setDescription('New target position')
            .setRequired(true)
            .setMinValue(1)
        ),
    });
  }

  public async execute(ctx: CommandContext, client: RainfallClient): Promise<any> {
    const player = client.musicManager.getPlayer(ctx.guild.id);
    if (!player) return ctx.sendError('No Player', 'No active music player in this server.');

    const from = ctx.getInteger('from');
    const to = ctx.getInteger('to');
    const queueLen = player.queue.tracks.length;

    if (!from || !to || from < 1 || from > queueLen || to < 1 || to > queueLen) {
      return ctx.sendError('Invalid Indices', `Positions must be between 1 and ${queueLen}.`);
    }

    if (from === to) {
      return ctx.sendInfo('No Change', 'The track is already in that position.');
    }

    const [track] = player.queue.tracks.splice(from - 1, 1);
    player.queue.tracks.splice(to - 1, 0, track);

    await ctx.sendSuccess('Track Moved 🔀', `Moved **${track.info.title}** from position #${from} to #${to}.`);
    await client.panelManager.updatePanel(ctx.guild.id, true);
  }
}

