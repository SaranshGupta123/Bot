import {
  SlashCommandBuilder,
  SlashCommandSubcommandsOnlyBuilder,
  SlashCommandOptionsOnlyBuilder,
  AutocompleteInteraction,
  PermissionResolvable,
} from 'discord.js';
import { CommandCategory } from '@rainfall/types';
import { CommandContext } from './CommandContext';
import type { RainfallClient } from '../client/RainfallClient';

export interface CommandOptions {
  name: string;
  description: string;
  category: CommandCategory;
  aliases?: string[];
  cooldown?: number; // seconds
  slashBuilder?:
    | SlashCommandBuilder
    | SlashCommandSubcommandsOnlyBuilder
    | SlashCommandOptionsOnlyBuilder
    | Omit<SlashCommandBuilder, 'addSubcommand' | 'addSubcommandGroup'>;
  requireVoice?: boolean;
  requireSameVoice?: boolean;
  requireQueue?: boolean;
  requireDJ?: boolean;
  userPermissions?: PermissionResolvable[];
  botPermissions?: PermissionResolvable[];
}

export abstract class BaseCommand {
  public readonly name: string;
  public readonly description: string;
  public readonly category: CommandCategory;
  public readonly aliases: string[];
  public readonly cooldown: number;
  public readonly slashBuilder?: CommandOptions['slashBuilder'];
  public readonly requireVoice: boolean;
  public readonly requireSameVoice: boolean;
  public readonly requireQueue: boolean;
  public readonly requireDJ: boolean;
  public readonly userPermissions: PermissionResolvable[];
  public readonly botPermissions: PermissionResolvable[];

  constructor(options: CommandOptions) {
    this.name = options.name.toLowerCase();
    this.description = options.description;
    this.category = options.category;
    this.aliases = options.aliases ? options.aliases.map((a) => a.toLowerCase()) : [];
    this.cooldown = options.cooldown ?? 3;
    this.slashBuilder = options.slashBuilder;
    this.requireVoice = options.requireVoice ?? false;
    this.requireSameVoice = options.requireSameVoice ?? false;
    this.requireQueue = options.requireQueue ?? false;
    this.requireDJ = options.requireDJ ?? false;
    this.userPermissions = options.userPermissions ?? [];
    this.botPermissions = options.botPermissions ?? [];
  }

  public abstract execute(ctx: CommandContext, client: RainfallClient): Promise<any>;

  public async autocomplete?(
    interaction: AutocompleteInteraction,
    client: RainfallClient
  ): Promise<any>;
}

