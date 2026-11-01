import { SlashCommandBuilder } from 'discord.js';
import { CommandCategory, LoopMode } from '@rainfall/types';
import { BaseCommand } from '../BaseCommand';
import { CommandContext } from '../CommandContext';
import type { RainfallClient } from '../../client/RainfallClient';

export class LoopCommand extends BaseCommand {
  constructor() {
    super({
      name: 'loop',
      description: 'Cycle or configure repeat mode (off, track, queue)',
      category: CommandCategory.MUSIC,
      requireVoice: true,
      requireSameVoice: true,
      requireQueue: true,
      slashBuilder: new SlashCommandBuilder()
        .setName('loop')
        .setDescription('Configure repeat mode')
        .addStringOption((opt) =>
          opt
            .setName('mode')
            .setDescription('Repeat mode: off, track, queue')
            .addChoices(
              { name: 'Disabled', value: 'off' },
              { name: 'Repeat Track', value: 'track' },
              { name: 'Repeat Entire Queue', value: 'queue' }
            )
        ),
    });
  }

  public async execute(ctx: CommandContext, client: RainfallClient): Promise<any> {
    const player = client.musicManager.getPlayer(ctx.guild.id);
    if (!player) return ctx.sendError('No Player', 'No active music player in this server.');

    const mode = ctx.getString('mode');

    let nextMode: 'off' | 'track' | 'queue' = 'off';

    if (mode && ['off', 'track', 'queue'].includes(mode)) {
      nextMode = mode as any;
    } else {
      // Cycle through modes
      const current = player.repeatMode;
      if (current === 'off') nextMode = 'track';
      else if (current === 'track') nextMode = 'queue';
      else nextMode = 'off';
    }

    await player.setRepeatMode(nextMode);

    let desc = 'Loop disabled.';
    if (nextMode === 'track') desc = 'Now repeating current track 🔂.';
    if (nextMode === 'queue') desc = 'Now repeating entire queue 🔁.';

    await ctx.sendSuccess('Loop Mode Updated 🔁', desc);
    await client.panelManager.updatePanel(ctx.guild.id, true);
  }
}

