import { SlashCommandBuilder } from 'discord.js';
import { CommandCategory } from '@rainfall/types';
import { BaseCommand } from '../BaseCommand';
import { CommandContext } from '../CommandContext';
import { formatDuration } from '@rainfall/shared';
import type { RainfallClient } from '../../client/RainfallClient';

export class SeekForwardCommand extends BaseCommand {
  constructor() {
    super({
      name: 'forward',
      description: 'Fast-forward playback by a specified number of seconds',
      category: CommandCategory.MUSIC,
      aliases: ['fwd', 'ff'],
      requireVoice: true,
      requireSameVoice: true,
      requireQueue: true,
      slashBuilder: new SlashCommandBuilder()
        .setName('forward')
        .setDescription('Fast forward playback by seconds')
        .addIntegerOption((opt) =>
          opt
            .setName('seconds')
            .setDescription('Seconds to fast forward (default 10)')
            .setRequired(false)
            .setMinValue(1)
            .setMaxValue(600)
        ),
    });
  }

  public async execute(ctx: CommandContext, client: RainfallClient): Promise<any> {
    const player = client.musicManager.getPlayer(ctx.guild.id);
    if (!player || !player.queue.current) {
      return ctx.sendError('No Song Playing', 'There is no music playing right now.');
    }

    const seconds = ctx.getInteger('seconds') || parseInt(ctx.args[0], 10) || 10;
    const currentPos = player.position || 0;
    const duration = player.queue.current.info.duration || 0;
    const targetPos = Math.min(duration, currentPos + seconds * 1000);

    await player.seek(targetPos);
    await ctx.sendSuccess('Fast Forward ⏩', `Fast forwarded \`${seconds}s\` to \`${formatDuration(targetPos)}\` / \`${formatDuration(duration)}\`.`);
    await client.panelManager.updatePanel(ctx.guild.id, true);
  }
}
