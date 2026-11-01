import { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } from 'discord.js';
import { CommandCategory } from '@rainfall/types';
import { BaseCommand } from '../BaseCommand';
import { CommandContext } from '../CommandContext';
import { BRAND_COLORS } from '@rainfall/shared';
import type { RainfallClient } from '../../client/RainfallClient';

export class NoPrefixCommand extends BaseCommand {
  constructor() {
    super({
      name: 'noprefix',
      description: 'Configure No-Prefix command execution for the server or specific users',
      category: CommandCategory.CONFIG,
      slashBuilder: new SlashCommandBuilder()
        .setName('noprefix')
        .setDescription('Manage No-Prefix mode')
        .addSubcommand((sub) =>
          sub
            .setName('toggle')
            .setDescription('Toggle server-wide No-Prefix mode on/off')
        )
        .addSubcommand((sub) =>
          sub
            .setName('add')
            .setDescription('Grant a user No-Prefix privilege')
            .addUserOption((opt) => opt.setName('user').setDescription('User to grant (leave blank for yourself)').setRequired(false))
        )
        .addSubcommand((sub) =>
          sub
            .setName('remove')
            .setDescription('Remove a user from No-Prefix privilege')
            .addUserOption((opt) => opt.setName('user').setDescription('User to revoke').setRequired(true))
        )
        .addSubcommand((sub) =>
          sub
            .setName('status')
            .setDescription('Check server No-Prefix configuration')
        ),
    });
  }

  public async execute(ctx: CommandContext, client: RainfallClient): Promise<any> {
    const isOwner = ctx.guild.ownerId === ctx.author.id;
    const isManager =
      isOwner ||
      ctx.member.permissions.has(PermissionsBitField.Flags.ManageGuild) ||
      ctx.member.permissions.has(PermissionsBitField.Flags.Administrator);

    let sub = ctx.interaction ? ctx.interaction.options.getSubcommand() : ctx.args[0]?.toLowerCase() || 'status';
    const cfg = await client.databaseService.getGuildConfig(ctx.guild.id);

    if (sub === 'toggle' || sub === 'on' || sub === 'off') {
      if (!isManager) {
        return ctx.sendError('Permission Denied', 'You need the **Manage Server** permission to toggle server-wide No-Prefix.');
      }
      const targetState = sub === 'on' ? true : sub === 'off' ? false : !cfg.noPrefix;
      await client.databaseService.updateGuildConfig(ctx.guild.id, { noPrefix: targetState });
      await ctx.sendSuccess(
        'No-Prefix Mode Updated 🚀',
        `Server-wide No-Prefix mode is now **${targetState ? 'ENABLED 🟢' : 'DISABLED ⚪'}**.\n\n` +
        (targetState
          ? 'Members can now type commands directly without any prefix! (e.g. `play starboy`, `skip`, `pause`, `queue`, `np`)'
          : `Commands now require the server prefix: \`${cfg.prefix}\``)
      );
      return;
    }

    if (sub === 'add') {
      if (!isManager) {
        return ctx.sendError('Permission Denied', 'You need the **Manage Server** permission to add No-Prefix users.');
      }
      let targetUser = ctx.interaction?.options.getUser('user');
      if (!targetUser && ctx.args[1]) {
        const id = ctx.args[1].replace(/[<@!>]/g, '');
        targetUser = await client.users.fetch(id).catch(() => null);
      }
      if (!targetUser) {
        targetUser = ctx.author;
      }

      await client.databaseService.ensureUser(targetUser.id, targetUser.username);

      const userIds = [...(cfg.noPrefixUserIds || [])];
      if (!userIds.includes(targetUser.id)) {
        userIds.push(targetUser.id);
        await client.databaseService.updateGuildConfig(ctx.guild.id, { noPrefixUserIds: userIds });
      }

      await ctx.sendSuccess('No-Prefix User Added 👤', `<@${targetUser.id}> can now use commands without any prefix!`);
      return;
    }

    if (sub === 'remove') {
      if (!isManager) {
        return ctx.sendError('Permission Denied', 'You need the **Manage Server** permission to remove No-Prefix users.');
      }
      let targetUser = ctx.interaction?.options.getUser('user');
      if (!targetUser && ctx.args[1]) {
        const id = ctx.args[1].replace(/[<@!>]/g, '');
        targetUser = await client.users.fetch(id).catch(() => null);
      }

      if (!targetUser) return ctx.sendError('User Required', 'Please mention a user or provide their ID.');

      const userIds = (cfg.noPrefixUserIds || []).filter((id) => id !== targetUser!.id);
      await client.databaseService.updateGuildConfig(ctx.guild.id, { noPrefixUserIds: userIds });

      await ctx.sendSuccess('No-Prefix User Removed 👤', `Removed No-Prefix privilege from <@${targetUser.id}>.`);
      return;
    }

    // Status (available for everyone to view)
    const embed = new EmbedBuilder()
      .setColor(BRAND_COLORS.RAIN_ACCENT)
      .setTitle('⚡ No-Prefix Configuration')
      .setDescription(
        `• **Server-Wide Status:** ${cfg.noPrefix !== false ? '🟢 **ENABLED**' : '⚪ **DISABLED**'}\n` +
        `• **Configured Prefix:** \`${cfg.prefix}\`\n` +
        `• **Authorized Users:** ${(cfg.noPrefixUserIds && cfg.noPrefixUserIds.length > 0) ? cfg.noPrefixUserIds.map((id) => `<@${id}>`).join(', ') : 'Everyone (Server-wide enabled)'}\n\n` +
        `When No-Prefix is enabled, anyone can type commands like \`play starboy\`, \`skip\`, \`queue\` without any prefix character!`
      );

    await ctx.reply({ embeds: [embed] });
  }
}
