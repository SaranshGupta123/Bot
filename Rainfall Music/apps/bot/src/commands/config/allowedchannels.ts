import { SlashCommandBuilder, PermissionsBitField, ChannelType } from 'discord.js';
import { CommandCategory } from '@rainfall/types';
import { BaseCommand } from '../BaseCommand';
import { CommandContext } from '../CommandContext';
import type { RainfallClient } from '../../client/RainfallClient';

export class AllowedChannelsCommand extends BaseCommand {
  constructor() {
    super({
      name: 'allowedchannels',
      description: 'Restrict bot commands to specific designated channels',
      category: CommandCategory.CONFIG,
      userPermissions: [PermissionsBitField.Flags.ManageGuild],
      slashBuilder: new SlashCommandBuilder()
        .setName('allowedchannels')
        .setDescription('Manage permitted text channels for bot commands')
        .addStringOption((opt) =>
          opt
            .setName('action')
            .setDescription('Action to take')
            .setRequired(true)
            .addChoices(
              { name: 'Add Current Channel', value: 'add' },
              { name: 'Remove Current Channel', value: 'remove' },
              { name: 'Clear All Restrictions', value: 'clear' },
              { name: 'List Allowed Channels', value: 'list' }
            )
        ),
    });
  }

  public async execute(ctx: CommandContext, client: RainfallClient): Promise<any> {
    if (!ctx.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
      return ctx.sendError('Permission Denied', 'You need the **Manage Server** permission to modify allowed channels.');
    }

    const action = ctx.getString('action') || ctx.args[0] || 'list';
    const cfg = await client.databaseService.getGuildConfig(ctx.guild.id);
    let channels = [...(cfg.allowedChannelIds || [])];

    if (action === 'add') {
      if (!channels.includes(ctx.channel.id)) {
        channels.push(ctx.channel.id);
        await client.databaseService.updateGuildConfig(ctx.guild.id, { allowedChannelIds: channels });
        await ctx.sendSuccess('Channel Added 🔒', `<#${ctx.channel.id}> added to allowed music channels.`);
      } else {
        await ctx.sendInfo('Already Allowed', `<#${ctx.channel.id}> is already in the allowed channels list.`);
      }
    } else if (action === 'remove') {
      channels = channels.filter((id) => id !== ctx.channel.id);
      await client.databaseService.updateGuildConfig(ctx.guild.id, { allowedChannelIds: channels });
      await ctx.sendSuccess('Channel Removed 🔓', `<#${ctx.channel.id}> removed from allowed music channels.`);
    } else if (action === 'clear') {
      await client.databaseService.updateGuildConfig(ctx.guild.id, { allowedChannelIds: [] });
      await ctx.sendSuccess('Restrictions Cleared 🔓', 'Music commands are now permitted in all server channels.');
    } else {
      if (channels.length === 0) {
        await ctx.sendInfo('No Restrictions', 'Music commands are currently permitted across all server channels.');
      } else {
        const list = channels.map((id) => `<#${id}>`).join(', ');
        await ctx.sendInfo('Allowed Channels 📋', `Commands are restricted to: ${list}`);
      }
    }
  }
}

