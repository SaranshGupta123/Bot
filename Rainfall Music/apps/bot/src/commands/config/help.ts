import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from 'discord.js';
import { CommandCategory } from '@rainfall/types';
import { BaseCommand } from '../BaseCommand';
import { CommandContext } from '../CommandContext';
import { BRAND_COLORS } from '@rainfall/shared';
import type { RainfallClient } from '../../client/RainfallClient';

export class HelpCommand extends BaseCommand {
  constructor() {
    super({
      name: 'help',
      description: 'Display the complete Rainfall commands catalog and usage guide',
      category: CommandCategory.CONFIG,
      aliases: ['h', 'commands'],
      slashBuilder: new SlashCommandBuilder()
        .setName('help')
        .setDescription('View the Rainfall commands guide')
        .addStringOption((opt) =>
          opt
            .setName('command')
            .setDescription('Specific command to inspect')
            .setRequired(false)
        ),
    });
  }

  public async execute(ctx: CommandContext, client: RainfallClient): Promise<any> {
    const specific = ctx.getString('command') || ctx.args[0];
    const cfg = await client.databaseService.getGuildConfig(ctx.guild.id);
    const prefix = cfg.prefix || '!';

    if (specific) {
      const targetName = specific.toLowerCase().replace(/^[!/]/, '');
      const resolved = client.commands.has(targetName) ? targetName : client.aliases.get(targetName);
      const cmd = resolved ? client.commands.get(resolved) : null;

      if (!cmd) {
        return ctx.sendError('Command Not Found', `No command matching \`${specific}\` was found.`);
      }

      const embed = new EmbedBuilder()
        .setColor(BRAND_COLORS.RAIN_ACCENT)
        .setTitle(`📖 Command: /${cmd.name}`)
        .setDescription(cmd.description)
        .addFields([
          { name: 'Category', value: cmd.category.toUpperCase(), inline: true },
          { name: 'Prefix Example', value: `\`${prefix}${cmd.name}\``, inline: true },
          { name: 'No-Prefix Example', value: `\`${cmd.name}\``, inline: true },
          { name: 'Aliases', value: cmd.aliases.length > 0 ? cmd.aliases.map((a) => `\`${a}\``).join(', ') : 'None', inline: true },
          { name: 'Cooldown', value: `${cmd.cooldown}s`, inline: true },
        ]);

      return ctx.reply({ embeds: [embed] });
    }

    const embed = new EmbedBuilder()
      .setColor(BRAND_COLORS.RAIN_ACCENT)
      .setAuthor({ name: 'RAINFALL MUSIC ECOSYSTEM • COMMANDS MANUAL', iconURL: client.user?.avatarURL() || undefined })
      .setTitle('✨ Complete Audio & System Command Catalog')
      .setDescription(
        `• **Server Prefix:** \`${prefix}\` (e.g. \`${prefix}play starboy\`)\n` +
        `• **No-Prefix Mode:** ${cfg.noPrefix !== false ? '🟢 **ENABLED** (Type directly: `play starboy`, `skip`, `queue`)' : '⚪ Disabled'}\n` +
        `• **Slash Commands:** Fully supported (\`/play\`, \`/skip\`, \`/panel\`)\n\n` +
        `*Select a category or use the commands below:*`
      )
      .addFields([
        {
          name: '🎵 Music Playback & Audio',
          value: '`play`, `pause`, `resume`, `skip`, `previous`, `stop`, `queue`, `nowplaying`, `volume`, `seek`, `shuffle`, `loop`, `autoplay`, `lyrics`, `filter`, `remove`, `move`, `clear`, `replay`, `join`, `leave`, `jump`, `grab`, `forward`, `rewind`',
          inline: false,
        },
        {
          name: '🎛️ Quick Audio Filters',
          value: '`bassboost`, `nightcore`, `vaporwave`, `8d`',
          inline: false,
        },
        {
          name: '⚙️ Server Configuration',
          value: '`prefix`, `noprefix`, `settings`, `djrole`, `allowedchannels`, `defaultvolume`, `permissions`, `247`',
          inline: false,
        },
        {
          name: '📁 Playlists',
          value: '`playlist` (*create*, *delete*, *add*, *remove*, *play*, *view*, *share*)',
          inline: false,
        },
        {
          name: '👤 User & Library',
          value: '`favorites`, `history`, `profile`, `stats`',
          inline: false,
        },
        {
          name: '🛠️ System & Diagnostics',
          value: '`ping`, `help`, `serverinfo`, `botinfo`, `maintenance`, `blacklist`',
          inline: false,
        },
      ])
      .setFooter({ text: `Total: ${client.commands.size} commands • Rainfall Audio Engine` })
      .setTimestamp();

    await ctx.reply({ embeds: [embed] });
  }
}

