import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { CommandCategory } from '@rainfall/types';
import { BaseCommand } from '../BaseCommand';
import { CommandContext } from '../CommandContext';
import { BRAND_COLORS, formatDuration } from '@rainfall/shared';
import type { RainfallClient } from '../../client/RainfallClient';

export class GrabCommand extends BaseCommand {
  constructor() {
    super({
      name: 'grab',
      description: 'Save the currently playing song to your Direct Messages',
      category: CommandCategory.MUSIC,
      aliases: ['save', 'dm', 'yoink'],
      requireQueue: true,
      slashBuilder: new SlashCommandBuilder()
        .setName('grab')
        .setDescription('Save the current song to your DMs'),
    });
  }

  public async execute(ctx: CommandContext, client: RainfallClient): Promise<any> {
    const player = client.musicManager.getPlayer(ctx.guild.id);
    if (!player || !player.queue.current) {
      return ctx.sendError('No Song Playing', 'There is no track currently playing to save.');
    }

    const current = player.queue.current;
    const reqId = (current.requester as any)?.id || (current.userData as any)?.requester?.id;

    const dmEmbed = new EmbedBuilder()
      .setColor(BRAND_COLORS.RAIN_ACCENT)
      .setAuthor({ name: 'Saved Track • Rainfall Music', iconURL: client.user?.avatarURL() || undefined })
      .setTitle(`🎵 ${current.info.title}`)
      .setURL(current.info.uri || 'https://discord.com')
      .setDescription(
        `• **Artist:** ${current.info.author || 'Unknown'}\n` +
        `• **Duration:** \`${formatDuration(current.info.duration || 0)}\`\n` +
        `• **Source:** ${current.info.sourceName?.toUpperCase() || 'Audio'}\n` +
        `• **Saved From Server:** **${ctx.guild.name}**\n` +
        `• **Requested In Server By:** ${reqId ? `<@${reqId}>` : 'Auto-DJ'}`
      )
      .setThumbnail(current.info.artworkUrl || null)
      .setFooter({ text: 'Rainfall Music Ecosystem • Premium Audio Experience' })
      .setTimestamp();

    try {
      await ctx.author.send({ embeds: [dmEmbed] });
      await ctx.sendSuccess('Song Saved 📬', 'I have sent the current track details to your Direct Messages!');
    } catch {
      await ctx.sendError('DMs Closed', 'Could not send you a Direct Message. Please ensure your DMs are open for this server.');
    }
  }
}
