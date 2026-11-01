import { SlashCommandBuilder } from 'discord.js';
import { CommandCategory } from '@rainfall/types';
import { BaseCommand } from '../BaseCommand';
import { CommandContext } from '../CommandContext';
import type { RainfallClient } from '../../client/RainfallClient';

export class LeaveCommand extends BaseCommand {
  constructor() {
    super({
      name: 'leave',
      description: 'Disconnect the bot from the voice channel',
      category: CommandCategory.MUSIC,
      aliases: ['dc', 'disconnect', 'quit'],
      requireVoice: false,
      requireSameVoice: false,
      slashBuilder: new SlashCommandBuilder()
        .setName('leave')
        .setDescription('Disconnect the bot from the voice channel'),
    });
  }

  public async execute(ctx: CommandContext, client: RainfallClient): Promise<any> {
    const player = client.musicManager.getPlayer(ctx.guild.id);
    if (!player) return ctx.sendError('Not Connected', 'The bot is not currently connected to any voice channel in this server.');

    // Ensure member has permission or is in the same voice channel
    const memberVc = ctx.member.voice.channelId;
    const isElevated = ctx.member.permissions.has('Administrator') || ctx.member.permissions.has('ManageGuild');

    if (!isElevated && memberVc !== player.voiceChannelId) {
      return ctx.sendError('Voice Channel Mismatch', `You must be in <#${player.voiceChannelId}> or have Manage Server permissions to disconnect the bot.`);
    }

    await player.destroy();
    await ctx.sendSuccess('Disconnected 👋', 'Left the voice channel and cleared the music session.');
  }
}

