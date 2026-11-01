import { SlashCommandBuilder, PermissionsBitField } from 'discord.js';
import { CommandCategory } from '@rainfall/types';
import { BaseCommand } from '../BaseCommand';
import { CommandContext } from '../CommandContext';
import type { RainfallClient } from '../../client/RainfallClient';

export class DefaultVolumeCommand extends BaseCommand {
  constructor() {
    super({
      name: 'defaultvolume',
      description: 'Configure the default starting volume for audio players in this server',
      category: CommandCategory.CONFIG,
      userPermissions: [PermissionsBitField.Flags.ManageGuild],
      slashBuilder: new SlashCommandBuilder()
        .setName('defaultvolume')
        .setDescription('Set default starting volume')
        .addIntegerOption((opt) =>
          opt
            .setName('volume')
            .setDescription('Starting volume between 1 and 150')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(150)
        ),
    });
  }

  public async execute(ctx: CommandContext, client: RainfallClient): Promise<any> {
    if (!ctx.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
      return ctx.sendError('Permission Denied', 'You need the **Manage Server** permission to change default volume.');
    }

    const vol = ctx.getInteger('volume');
    if (!vol || vol < 1 || vol > 150) {
      return ctx.sendError('Invalid Volume', 'Volume must be between 1 and 150.');
    }

    await client.databaseService.updateGuildConfig(ctx.guild.id, {
      defaultVolume: vol,
    });

    await ctx.sendSuccess('Default Volume Set 🔊', `Default player volume for this server set to **${vol}%**.`);
  }
}

