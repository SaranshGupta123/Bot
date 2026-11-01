import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { CommandCategory } from '@rainfall/types';
import { BaseCommand } from '../BaseCommand';
import { CommandContext } from '../CommandContext';
import { BRAND_COLORS } from '@rainfall/shared';
import type { RainfallClient } from '../../client/RainfallClient';

export class InviteCommand extends BaseCommand {
  constructor() {
    super({
      name: 'invite',
      description: 'Get the bot invite link to add Rainfall to other servers',
      category: CommandCategory.ADMIN,
      aliases: ['inv', 'addbot'],
      slashBuilder: new SlashCommandBuilder()
        .setName('invite')
        .setDescription('Get Rainfall invite link'),
    });
  }

  public async execute(ctx: CommandContext, client: RainfallClient): Promise<any> {
    const clientId = client.user?.id || '1500041149590873606';
    const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${clientId}&permissions=37088600&scope=bot%20applications.commands`;

    const embed = new EmbedBuilder()
      .setColor(BRAND_COLORS.RAIN_ACCENT)
      .setTitle('🌧️ Invite Rainfall Music Bot')
      .setDescription(
        'Elevate your Discord server with **Rainfall** — ultra-responsive music playback, interactive voice panels, DSP audio filters, and seamless No-Prefix controls!'
      )
      .addFields([
        { name: '✨ Key Features', value: '• Studio-quality Lavalink v4 engine\n• Native interactive 15-button voice panels\n• No-Prefix instant command execution\n• Spotify, YouTube & Soundcloud resolution\n• Next.js real-time web dashboard', inline: false },
        { name: '🔗 Direct Bot Invite', value: `[Click Here to Invite](${inviteUrl})`, inline: true },
      ])
      .setFooter({ text: 'Rainfall Music Ecosystem' });

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setLabel('Invite Rainfall')
        .setStyle(ButtonStyle.Link)
        .setURL(inviteUrl)
        .setEmoji('🌧️')
    );

    await ctx.reply({ embeds: [embed], components: [row] });
  }
}

