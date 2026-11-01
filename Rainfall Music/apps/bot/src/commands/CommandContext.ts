import {
  ChatInputCommandInteraction,
  Message,
  Guild,
  GuildMember,
  TextBasedChannel,
  User,
  MessageReplyOptions,
  InteractionReplyOptions,
  InteractionEditReplyOptions,
  MessagePayload,
} from 'discord.js';
import { createSuccessEmbed, createErrorEmbed, createInfoEmbed } from '@rainfall/shared';

export interface CommandContextOptions {
  interaction?: ChatInputCommandInteraction;
  message?: Message;
  args?: string[];
  prefix?: string;
}

export class CommandContext {
  public readonly interaction?: ChatInputCommandInteraction;
  public readonly message?: Message;
  public readonly isSlash: boolean;
  public readonly args: string[];
  public readonly prefix: string;
  private deferred = false;
  private replied = false;
  private lastMessage: Message | null = null;

  constructor(options: CommandContextOptions) {
    this.interaction = options.interaction;
    this.message = options.message;
    this.isSlash = !!this.interaction;
    this.args = options.args || [];
    this.prefix = options.prefix || '!';
  }

  public get guild(): Guild {
    const g = this.interaction?.guild || this.message?.guild;
    if (!g) throw new Error('Command executed outside of a guild context');
    return g;
  }

  public get channel(): TextBasedChannel {
    const ch = this.interaction?.channel || this.message?.channel;
    if (!ch) throw new Error('Command executed outside of a valid text channel');
    return ch;
  }

  public get author(): User {
    return this.interaction ? this.interaction.user : this.message!.author;
  }

  public get member(): GuildMember {
    const m = this.interaction?.member || this.message?.member;
    if (!m) throw new Error('Guild member is not available');
    return m as GuildMember;
  }

  public getString(name: string, index?: number): string | null {
    if (this.interaction) {
      return this.interaction.options.getString(name);
    }
    if (index !== undefined && this.args[index] !== undefined) {
      return this.args[index];
    }
    return this.args.length > 0 ? this.args.join(' ') : null;
  }

  public getInteger(name: string, index?: number): number | null {
    if (this.interaction) {
      return this.interaction.options.getInteger(name);
    }
    const raw = index !== undefined ? this.args[index] : this.args[0];
    if (raw === undefined) return null;
    const num = parseInt(raw, 10);
    return isNaN(num) ? null : num;
  }

  public getBoolean(name: string, index?: number): boolean | null {
    if (this.interaction) {
      return this.interaction.options.getBoolean(name);
    }
    const raw = index !== undefined ? this.args[index] : this.args[0];
    if (!raw) return null;
    if (['true', 'yes', 'on', '1', 'enable'].includes(raw.toLowerCase())) return true;
    if (['false', 'no', 'off', '0', 'disable'].includes(raw.toLowerCase())) return false;
    return null;
  }

  public async defer(ephemeral: boolean = false): Promise<void> {
    if (this.deferred || this.replied) return;
    this.deferred = true;
    if (this.interaction) {
      await this.interaction.deferReply({ ephemeral });
    } else if (this.channel && 'sendTyping' in this.channel) {
      await (this.channel as any).sendTyping().catch(() => {});
    }
  }

  public async reply(options: string | MessagePayload | InteractionReplyOptions | MessageReplyOptions): Promise<any> {
    this.replied = true;
    if (this.interaction) {
      if (this.interaction.deferred || this.interaction.replied) {
        return this.interaction.editReply(options as InteractionEditReplyOptions);
      }
      return this.interaction.reply(options as InteractionReplyOptions);
    } else {
      const sent = await this.message!.reply(options as MessageReplyOptions);
      this.lastMessage = sent;
      return sent;
    }
  }

  public async editReply(options: string | MessagePayload | InteractionEditReplyOptions): Promise<any> {
    if (this.interaction) {
      return this.interaction.editReply(options);
    } else if (this.lastMessage) {
      return this.lastMessage.edit(options as any);
    } else {
      return this.reply(options as any);
    }
  }

  public async sendSuccess(title: string, description?: string): Promise<any> {
    const embed = createSuccessEmbed(title, description);
    return this.reply({ embeds: [embed] });
  }

  public async sendError(title: string, description?: string): Promise<any> {
    const embed = createErrorEmbed(title, description);
    return this.reply({ embeds: [embed] });
  }

  public async sendInfo(title: string, description?: string): Promise<any> {
    const embed = createInfoEmbed(title, description);
    return this.reply({ embeds: [embed] });
  }
}

