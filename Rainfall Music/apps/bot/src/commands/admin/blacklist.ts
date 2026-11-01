import { SlashCommandBuilder } from 'discord.js';
import { prisma } from '@rainfall/database';
import { CommandCategory } from '@rainfall/types';
import { BaseCommand } from '../BaseCommand';
import { CommandContext } from '../CommandContext';
import type { RainfallClient } from '../../client/RainfallClient';

export class BlacklistCommand extends BaseCommand {
  constructor() {
    super({
      name: 'blacklist',
      description: 'Add or remove a user/guild from the global blacklist (Developer Only)',
      category: CommandCategory.ADMIN,
      slashBuilder: new SlashCommandBuilder()
        .setName('blacklist')
        .setDescription('Manage blacklisted entities')
        .addStringOption((opt) =>
          opt
            .setName('type')
            .setDescription('Entity type to blacklist')
            .setRequired(true)
            .addChoices({ name: 'User', value: 'user' }, { name: 'Server', value: 'guild' })
        )
        .addStringOption((opt) => opt.setName('id').setDescription('Snowflake ID of entity').setRequired(true))
        .addBooleanOption((opt) => opt.setName('blocked').setDescription('True to block, false to unblock').setRequired(true)),
    });
  }

  public async execute(ctx: CommandContext, client: RainfallClient): Promise<any> {
    if (!client.config.DEVELOPER_USER_IDS.includes(ctx.author.id)) {
      return ctx.sendError('Restricted Command', 'This command can only be executed by verified system developers.');
    }

    const type = ctx.getString('type');
    const targetId = ctx.getString('id');
    const blocked = ctx.getBoolean('blocked') ?? true;

    if (!type || !targetId) return ctx.sendError('Arguments Missing', 'Provide type and target ID.');

    if (type === 'user') {
      await prisma.user.upsert({
        where: { id: targetId },
        update: { isBlacklisted: blocked },
        create: { id: targetId, username: 'Blacklisted User', isBlacklisted: blocked },
      });
      await ctx.sendSuccess('Blacklist Updated 🚫', `User \`${targetId}\` blacklisted status: **${blocked}**.`);
    } else {
      await prisma.guild.upsert({
        where: { id: targetId },
        update: { isBlacklisted: blocked },
        create: { id: targetId, name: 'Blacklisted Guild', ownerId: '0', isBlacklisted: blocked },
      });
      await ctx.sendSuccess('Blacklist Updated 🚫', `Server \`${targetId}\` blacklisted status: **${blocked}**.`);
    }
  }
}

