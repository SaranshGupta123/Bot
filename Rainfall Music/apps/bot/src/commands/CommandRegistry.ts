import {
  ChatInputCommandInteraction,
  Message,
  AutocompleteInteraction,
  REST,
  Routes,
} from 'discord.js';
import { createScopedLogger } from '@rainfall/shared';
import { BaseCommand } from './BaseCommand';
import { CommandContext } from './CommandContext';
import { checkVoice } from '../middleware/voiceCheck';
import { checkDJ } from '../middleware/djCheck';
import { checkChannel } from '../middleware/channelCheck';
import { checkCooldown } from '../middleware/cooldownCheck';
import type { RainfallClient } from '../client/RainfallClient';

const log = createScopedLogger('CommandRegistry');

export class CommandRegistry {
  constructor(private client: RainfallClient) {}

  public register(command: BaseCommand): void {
    this.client.commands.set(command.name, command);
    for (const alias of command.aliases) {
      this.client.aliases.set(alias, command.name);
    }
    log.debug(`Registered command: ${command.name} [Aliases: ${command.aliases.join(', ') || 'none'}]`);
  }

  public registerMultiple(commands: BaseCommand[]): void {
    for (const cmd of commands) {
      this.register(cmd);
    }
  }

  public async handleSlashCommand(interaction: ChatInputCommandInteraction): Promise<void> {
    const cmd = this.client.commands.get(interaction.commandName);
    if (!cmd) return;

    const ctx = new CommandContext({ interaction });

    try {
      // 0. Immediately acknowledge interaction with Discord to prevent 3-second timeouts
      await ctx.defer(false);

      // 1. Channel check
      const channelResult = await checkChannel(ctx, this.client);
      if (!channelResult.passed) {
        await ctx.sendError('Channel Restricted', channelResult.message);
        return;
      }

      // 2. Voice check
      const voiceResult = checkVoice(ctx, this.client, {
        requireVoice: cmd.requireVoice,
        requireSameVoice: cmd.requireSameVoice,
      });
      if (!voiceResult.passed) {
        await ctx.sendError('Voice Channel Required', voiceResult.message);
        return;
      }

      // 3. Queue check
      if (cmd.requireQueue) {
        const player = this.client.musicManager.getPlayer(ctx.guild.id);
        if (!player || !player.queue.current) {
          await ctx.sendError('No Active Queue', 'There is no music currently playing in this server.');
          return;
        }
      }

      // 4. DJ role check
      const djResult = await checkDJ(ctx, this.client, cmd.requireDJ);
      if (!djResult.passed) {
        await ctx.sendError('Permission Denied', djResult.message);
        return;
      }

      // 5. Cooldown check
      const cooldownResult = checkCooldown(ctx, cmd, this.client);
      if (!cooldownResult.passed) {
        await ctx.sendError('Command On Cooldown', cooldownResult.message);
        return;
      }

      // Execute command
      await cmd.execute(ctx, this.client);
    } catch (err: unknown) {
      log.error(`Error executing slash command /${cmd.name}`, err);
      await ctx.sendError('Execution Error', 'An unexpected error occurred while executing this command.');
    }
  }

  public async handlePrefixCommand(message: Message): Promise<void> {
    if (message.author.bot || !message.guild) return;

    const content = message.content.trim();
    if (!content) return;

    const guildConfig = await this.client.databaseService.getGuildConfig(message.guild.id);
    const configuredPrefix = guildConfig.prefix || '!';

    let matchedPrefix: string | null = null;
    let isNoPrefixExecution = false;

    // 1. Check Mention Prefix: <@!botId> or <@botId>
    const mentionRegex = new RegExp(`^<@!?${this.client.user?.id}>\\s*`);
    const mentionMatch = content.match(mentionRegex);

    if (mentionMatch) {
      matchedPrefix = mentionMatch[0];
    } else {
      // 2. Check candidate prefixes (configured prefix prioritized, plus common bot prefixes)
      const candidatePrefixes = [
        configuredPrefix,
        '!',
        'r?',
        'r!',
        '?',
        '#',
        '.',
        '>',
      ].filter((p, idx, arr) => Boolean(p) && p.toLowerCase() !== 'none' && arr.indexOf(p) === idx);

      for (const cand of candidatePrefixes) {
        if (content.startsWith(cand)) {
          const remainder = content.slice(cand.length).trim();
          const potentialCommand = remainder.split(/\s+/)[0]?.toLowerCase();
          if (
            potentialCommand &&
            (this.client.commands.has(potentialCommand) || this.client.aliases.has(potentialCommand))
          ) {
            matchedPrefix = cand;
            break;
          }
        }
      }
    }

    // 3. Check No-Prefix Mode:
    // Enabled by default server-wide, or for specific authorized users, or if prefix is set to 'none'
    if (matchedPrefix === null) {
      const noPrefixAllowed =
        guildConfig.noPrefix !== false ||
        (guildConfig.noPrefixUserIds && guildConfig.noPrefixUserIds.includes(message.author.id)) ||
        configuredPrefix.toLowerCase() === 'none' ||
        configuredPrefix === '';

      if (noPrefixAllowed) {
        const firstWord = content.split(/\s+/)[0]?.toLowerCase();
        if (firstWord) {
          const resolved = this.client.commands.has(firstWord)
            ? firstWord
            : this.client.aliases.get(firstWord);
          if (resolved) {
            isNoPrefixExecution = true;
            matchedPrefix = '';
          }
        }
      }
    }

    if (matchedPrefix === null && !isNoPrefixExecution) return;

    const cleanBody = matchedPrefix ? content.slice(matchedPrefix.length).trim() : content;
    const rawArgs = cleanBody.split(/\s+/);
    const commandName = rawArgs.shift()?.toLowerCase();
    if (!commandName) return;

    const resolvedName = this.client.commands.has(commandName)
      ? commandName
      : this.client.aliases.get(commandName);

    if (!resolvedName) return;

    const cmd = this.client.commands.get(resolvedName);
    if (!cmd) return;

    const ctx = new CommandContext({
      message,
      args: rawArgs,
      prefix: matchedPrefix || '',
    });

    try {
      // 1. Channel check
      const channelResult = await checkChannel(ctx, this.client);
      if (!channelResult.passed) {
        await ctx.sendError('Channel Restricted', channelResult.message);
        return;
      }

      // 2. Voice check
      const voiceResult = checkVoice(ctx, this.client, {
        requireVoice: cmd.requireVoice,
        requireSameVoice: cmd.requireSameVoice,
      });
      if (!voiceResult.passed) {
        await ctx.sendError('Voice Channel Required', voiceResult.message);
        return;
      }

      // 3. Queue check
      if (cmd.requireQueue) {
        const player = this.client.musicManager.getPlayer(ctx.guild.id);
        if (!player || !player.queue.current) {
          await ctx.sendError('No Active Queue', 'There is no music currently playing in this server.');
          return;
        }
      }

      // 4. DJ role check
      const djResult = await checkDJ(ctx, this.client, cmd.requireDJ);
      if (!djResult.passed) {
        await ctx.sendError('Permission Denied', djResult.message);
        return;
      }

      // 5. Cooldown check
      const cooldownResult = checkCooldown(ctx, cmd, this.client);
      if (!cooldownResult.passed) {
        await ctx.sendError('Command On Cooldown', cooldownResult.message);
        return;
      }

      // Execute command
      await cmd.execute(ctx, this.client);
    } catch (err: unknown) {
      log.error(`Error executing prefix command ${matchedPrefix || ''}${cmd.name}`, err);
      await ctx.sendError('Execution Error', 'An unexpected error occurred while executing this command.');
    }
  }

  public async handleAutocomplete(interaction: AutocompleteInteraction): Promise<void> {
    const cmd = this.client.commands.get(interaction.commandName);
    if (cmd && cmd.autocomplete) {
      try {
        await cmd.autocomplete(interaction, this.client);
      } catch (err: unknown) {
        log.warn(`Autocomplete failed for ${interaction.commandName}: ${(err as Error).message}`);
      }
    }
  }

  public async deploySlashCommands(): Promise<void> {
    const slashCommands: any[] = [];

    for (const cmd of this.client.commands.values()) {
      if (cmd.slashBuilder) {
        slashCommands.push(cmd.slashBuilder.toJSON());
      }
    }

    log.info(`Deploying ${slashCommands.length} application slash commands to Discord API...`);

    const rest = new REST({ version: '10' }).setToken(this.client.config.DISCORD_TOKEN);
    try {
      await rest.put(Routes.applicationCommands(this.client.config.DISCORD_CLIENT_ID), {
        body: slashCommands,
      });
      log.info(`Successfully registered ${slashCommands.length} application commands.`);
    } catch (err: unknown) {
      log.warn(`Could not deploy commands to Discord REST API (token may be unconfigured): ${(err as Error).message}`);
    }
  }
}
