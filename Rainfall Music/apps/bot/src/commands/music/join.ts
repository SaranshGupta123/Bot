import { SlashCommandBuilder, PermissionsBitField } from 'discord.js';
import { CommandCategory } from '@rainfall/types';
import { BaseCommand } from '../BaseCommand';
import { CommandContext } from '../CommandContext';
import type { RainfallClient } from '../../client/RainfallClient';

export class JoinCommand extends BaseCommand {
  constructor() {
    super({
      name: 'join',
      description: 'Connect the bot to your current voice channel',
      category: CommandCategory.MUSIC,
      aliases: ['j', 'connect', 'summon'],
      requireVoice: true,
      slashBuilder: new SlashCommandBuilder()
        .setName('join')
        .setDescription('Connect the bot to your voice channel'),
    });
  }

  public async execute(ctx: CommandContext, client: RainfallClient): Promise<any> {
    const voiceChannel = ctx.member.voice.channel;
    if (!voiceChannel) {
      return ctx.sendError('Voice Channel Required', 'You must be connected to a voice channel to use this command.');
    }

    const permissions = voiceChannel.permissionsFor(ctx.guild.members.me!);
    if (!permissions.has(PermissionsBitField.Flags.Connect)) {
      return ctx.sendError('Missing Permissions', `I lack the **Connect** permission in <#${voiceChannel.id}>.`);
    }
    if (!permissions.has(PermissionsBitField.Flags.Speak)) {
      return ctx.sendError('Missing Permissions', `I lack the **Speak** permission in <#${voiceChannel.id}>.`);
    }

    const existingPlayer = client.musicManager.getPlayer(ctx.guild.id);
    if (existingPlayer && existingPlayer.voiceChannelId === voiceChannel.id) {
      return ctx.sendInfo('Already Connected 🔊', `I am already in your voice channel: <#${voiceChannel.id}>.`);
    }

    try {
      const player = await client.musicManager.createOrGetPlayer(
        ctx.guild.id,
        voiceChannel.id,
        ctx.channel.id
      );

      await ctx.sendSuccess(
        'Connected to Voice 🔊',
        `Joined <#${voiceChannel.id}> and ready to play high-fidelity audio! Use \`/play\` or type \`play <song>\` to begin.`
      );
    } catch (err: unknown) {
      return ctx.sendError(
        'Audio Cluster Connecting 🔊',
        (err as Error).message || 'The audio player is currently initializing. Please try again in a few seconds.'
      );
    }
  }
}

