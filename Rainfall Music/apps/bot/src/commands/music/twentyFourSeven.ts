import { SlashCommandBuilder } from 'discord.js';
import { CommandCategory } from '@rainfall/types';
import { BaseCommand } from '../BaseCommand';
import { CommandContext } from '../CommandContext';
import type { RainfallClient } from '../../client/RainfallClient';

export class TwentyFourSevenCommand extends BaseCommand {
  constructor() {
    super({
      name: '247',
      description: 'Keep the bot connected to the voice channel 24/7 without disconnecting',
      category: CommandCategory.MUSIC,
      requireDJ: true,
      requireVoice: true,
      slashBuilder: new SlashCommandBuilder()
        .setName('247')
        .setDescription('Toggle 24/7 continuous voice presence'),
    });
  }

  public async execute(ctx: CommandContext, client: RainfallClient): Promise<any> {
    const config = await client.databaseService.getGuildConfig(ctx.guild.id);
    const nextState = !config.twentyFourSeven;

    await client.databaseService.updateGuildConfig(ctx.guild.id, {
      twentyFourSeven: nextState,
    });

    await ctx.sendSuccess(
      '24/7 Mode Updated 🌐',
      `24/7 voice channel stay is now **${nextState ? 'ACTIVE' : 'INACTIVE'}**. The bot will ${nextState ? 'remain connected even when alone' : 'disconnect after playback finishes'}.`
    );
  }
}

