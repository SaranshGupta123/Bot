import { SlashCommandBuilder } from 'discord.js';
import { CommandCategory } from '@rainfall/types';
import { BaseCommand } from '../BaseCommand';
import { CommandContext } from '../CommandContext';
import { formatDuration } from '@rainfall/shared';
import type { RainfallClient } from '../../client/RainfallClient';

export class SeekCommand extends BaseCommand {
  constructor() {
    super({
      name: 'seek',
      description: 'Seek to a timestamp within the currently playing track',
      category: CommandCategory.MUSIC,
      requireVoice: true,
      requireSameVoice: true,
      requireQueue: true,
      slashBuilder: new SlashCommandBuilder()
        .setName('seek')
        .setDescription('Seek to timestamp (e.g. 1:30 or seconds)')
        .addStringOption((opt) =>
          opt
            .setName('time')
            .setDescription('Timestamp formatted as mm:ss or total seconds')
            .setRequired(true)
        ),
    });
  }

  public async execute(ctx: CommandContext, client: RainfallClient): Promise<any> {
    const player = client.musicManager.getPlayer(ctx.guild.id);
    if (!player || !player.queue.current) return ctx.sendError('No Track', 'No song is currently playing.');

    const timeStr = ctx.getString('time');
    if (!timeStr) return ctx.sendError('Time Required', 'Please provide a valid time (e.g. `1:30` or `90`).');

    let targetMs = 0;
    if (timeStr.includes(':')) {
      const parts = timeStr.split(':').map((p) => parseInt(p, 10));
      if (parts.length === 2) {
        targetMs = (parts[0] * 60 + parts[1]) * 1000;
      } else if (parts.length === 3) {
        targetMs = (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000;
      }
    } else {
      targetMs = parseInt(timeStr, 10) * 1000;
    }

    if (isNaN(targetMs) || targetMs < 0) {
      return ctx.sendError('Invalid Format', 'Please specify timestamp as `mm:ss` (e.g. `2:15`) or raw seconds.');
    }

    const duration = player.queue.current.info.duration;
    if (targetMs > duration) {
      return ctx.sendError('Out of Bounds', `Seek timestamp exceeds track duration (\`${formatDuration(duration)}\`).`);
    }

    await player.seek(targetMs);
    await ctx.sendSuccess('Position Updated ⏩', `Seeked track to \`${formatDuration(targetMs)}\`.`);
    await client.panelManager.updatePanel(ctx.guild.id, true);
  }
}

