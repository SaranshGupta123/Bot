import {
  Client,
  Collection,
  GatewayIntentBits,
  Partials,
} from 'discord.js';
import { config, AppConfig } from '@rainfall/config';
import { createScopedLogger } from '@rainfall/shared';
import { BaseCommand } from '../commands/BaseCommand';
import { MusicManager } from '../services/music/MusicManager';
import { ControlPanelManager } from '../services/panels/ControlPanelManager';
import { DatabaseService } from '../services/database/DatabaseService';
import { PanelInteractionHandler } from '../interactions/PanelInteractionHandler';

const log = createScopedLogger('RainfallClient');

export class RainfallClient extends Client {
  public commands = new Collection<string, BaseCommand>();
  public aliases = new Collection<string, string>();
  public cooldowns = new Collection<string, Collection<string, number>>();
  public config: AppConfig;
  public musicManager: MusicManager;
  public panelManager: ControlPanelManager;
  public databaseService: DatabaseService;
  public panelInteractionHandler: PanelInteractionHandler;

  constructor() {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions,
      ],
      partials: [
        Partials.Channel,
        Partials.Message,
        Partials.User,
        Partials.GuildMember,
        Partials.Reaction,
      ],
      allowedMentions: {
        parse: ['users', 'roles'],
        repliedUser: false,
      },
    });

    this.config = config;
    this.databaseService = new DatabaseService();
    this.musicManager = new MusicManager(this);
    this.panelManager = new ControlPanelManager(this);
    this.panelInteractionHandler = new PanelInteractionHandler(this);
  }

  public async start(): Promise<void> {
    log.info('Connecting to Discord Gateway...');
    await this.login(this.config.DISCORD_TOKEN);
  }
}

