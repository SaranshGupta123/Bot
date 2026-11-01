import { SlashCommandBuilder } from 'discord.js';
import { CommandCategory } from '@rainfall/types';
import { BaseCommand } from '../BaseCommand';
import { CommandContext } from '../CommandContext';
import { redis } from '@rainfall/shared';
import type { RainfallClient } from '../../client/RainfallClient';

export class MaintenanceCommand extends BaseCommand {
  constructor() {
    super({
      name: 'maintenance',
      description: 'Toggle global maintenance mode (Developer Only)',
      category: CommandCategory.ADMIN,
      slashBuilder: new SlashCommandBuilder()
        .setName('maintenance')
        .setDescription('Toggle global maintenance mode')
        .addBooleanOption((opt) => opt.setName('enabled').setDescription('Enable or disable maintenance mode').setRequired(true)),
    });
  }

  public async execute(ctx: CommandContext, client: RainfallClient): Promise<any> {
    if (!client.config.DEVELOPER_USER_IDS.includes(ctx.author.id)) {
      return ctx.sendError('Restricted Command', 'This command can only be executed by verified system developers.');
    }

    const enabled = ctx.getBoolean('enabled') ?? true;
    await redis.set('system:maintenance_mode', enabled ? 'true' : 'false').catch(() => {});

    await ctx.sendSuccess(
      'Maintenance Mode Updated 🛠️',
      `System maintenance mode is now **${enabled ? 'ENABLED' : 'DISABLED'}**.`
    );
  }
}

