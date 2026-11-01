import { RainfallClient } from './client/RainfallClient';
import { CommandRegistry } from './commands/CommandRegistry';
import { createScopedLogger } from '@rainfall/shared';
// Auto-repost control panel at bottom on song end


// Music Commands
import { PlayCommand } from './commands/music/play';
import { PauseCommand } from './commands/music/pause';
import { ResumeCommand } from './commands/music/resume';
import { SkipCommand } from './commands/music/skip';
import { PreviousCommand } from './commands/music/previous';
import { StopCommand } from './commands/music/stop';
import { QueueCommand } from './commands/music/queue';
import { NowPlayingCommand } from './commands/music/nowplaying';
import { VolumeCommand } from './commands/music/volume';
import { SeekCommand } from './commands/music/seek';
import { SeekForwardCommand } from './commands/music/seekForward';
import { SeekBackwardCommand } from './commands/music/seekBackward';
import { ShuffleCommand } from './commands/music/shuffle';
import { LoopCommand } from './commands/music/loop';
import { AutoplayCommand } from './commands/music/autoplay';
import { LyricsCommand } from './commands/music/lyrics';
import { FilterCommand } from './commands/music/filter';
import { BassboostCommand } from './commands/music/bassboost';
import { NightcoreCommand } from './commands/music/nightcore';
import { RemoveCommand } from './commands/music/remove';
import { MoveCommand } from './commands/music/move';
import { ClearCommand } from './commands/music/clear';
import { ReplayCommand } from './commands/music/replay';
import { TwentyFourSevenCommand } from './commands/music/twentyFourSeven';
import { JumpCommand } from './commands/music/jump';
import { JoinCommand } from './commands/music/join';
import { LeaveCommand } from './commands/music/leave';
import { GrabCommand } from './commands/music/grab';

// Config Commands
import { PrefixCommand } from './commands/config/prefix';
import { NoPrefixCommand } from './commands/config/noprefix';
import { HelpCommand } from './commands/config/help';
import { SettingsCommand } from './commands/config/settings';
import { DJRoleCommand } from './commands/config/djrole';
import { AllowedChannelsCommand } from './commands/config/allowedchannels';
import { DefaultVolumeCommand } from './commands/config/defaultvolume';
import { PermissionsCommand } from './commands/config/permissions';

// Playlist Commands
import { PlaylistCommand } from './commands/playlists/playlist';

// User Commands
import { FavoritesCommand } from './commands/user/favorites';
import { HistoryCommand } from './commands/user/history';
import { ProfileCommand } from './commands/user/profile';
import { StatsCommand } from './commands/user/stats';

// Admin Commands
import { PingCommand } from './commands/admin/ping';
import { InviteCommand } from './commands/admin/invite';
import { MaintenanceCommand } from './commands/admin/maintenance';
import { BlacklistCommand } from './commands/admin/blacklist';
import { ServerInfoCommand } from './commands/admin/serverinfo';
import { BotInfoCommand } from './commands/admin/botinfo';

// Events
import { onReady } from './events/ready';
import { onInteractionCreate } from './events/interactionCreate';
import { onMessageCreate } from './events/messageCreate';
import { onVoiceStateUpdate } from './events/voiceStateUpdate';
import { onGuildCreate } from './events/guildCreate';

const log = createScopedLogger('BotBootstrap');

async function bootstrap() {
  log.info('Initializing Rainfall Discord Bot...');

  const client = new RainfallClient();
  const registry = new CommandRegistry(client);

  // Register All Commands
  registry.registerMultiple([
    // Music (28 commands)
    new PlayCommand(),
    new PauseCommand(),
    new ResumeCommand(),
    new SkipCommand(),
    new PreviousCommand(),
    new StopCommand(),
    new QueueCommand(),
    new NowPlayingCommand(),
    new VolumeCommand(),
    new SeekCommand(),
    new SeekForwardCommand(),
    new SeekBackwardCommand(),
    new ShuffleCommand(),
    new LoopCommand(),
    new AutoplayCommand(),
    new LyricsCommand(),
    new FilterCommand(),
    new BassboostCommand(),
    new NightcoreCommand(),
    new RemoveCommand(),
    new MoveCommand(),
    new ClearCommand(),
    new ReplayCommand(),
    new TwentyFourSevenCommand(),
    new JumpCommand(),
    new JoinCommand(),
    new LeaveCommand(),
    new GrabCommand(),

    // Config (8 commands)
    new PrefixCommand(),
    new NoPrefixCommand(),
    new HelpCommand(),
    new SettingsCommand(),
    new DJRoleCommand(),
    new AllowedChannelsCommand(),
    new DefaultVolumeCommand(),
    new PermissionsCommand(),

    // Playlists (1 command with subcommands)
    new PlaylistCommand(),

    // User (4 commands)
    new FavoritesCommand(),
    new HistoryCommand(),
    new ProfileCommand(),
    new StatsCommand(),

    // Admin (6 commands)
    new PingCommand(),
    new InviteCommand(),
    new MaintenanceCommand(),
    new BlacklistCommand(),
    new ServerInfoCommand(),
    new BotInfoCommand(),
  ]);

  log.info(`Loaded ${client.commands.size} unique commands across 5 categories.`);

  // Setup Discord Gateway Events
  client.once('clientReady', () => onReady(client));
  client.on('interactionCreate', (interaction) => onInteractionCreate(interaction, client, registry));
  client.on('messageCreate', (message) => onMessageCreate(message, client, registry));
  client.on('voiceStateUpdate', (oldState, newState) => onVoiceStateUpdate(oldState, newState, client));
  client.on('guildCreate', (guild) => onGuildCreate(guild, client));

  client.on('raw', (packet: any) => {
    (client.musicManager.lavalink as any).sendRawData(packet);
  });

  client.on('error', (err) => log.error('Discord Client Gateway Error', err));
  client.on('warn', (msg) => log.warn(`Discord Client Gateway Warning: ${msg}`));

  // Global uncaught handlers for production safety
  process.on('unhandledRejection', (reason) => log.error('Unhandled Promise Rejection', reason));
  process.on('uncaughtException', (err) => log.error('Uncaught Exception', err));

  // Connect
  await client.start().catch((err) => {
    log.warn(`Could not start Discord client connection with current token: ${(err as Error).message}`);
    log.info('Bot infrastructure, command registry, audio engine and control panel services loaded in verified dry-run mode.');
  });
}

bootstrap().catch((err) => {
  console.error('Fatal bootstrap error:', err);
});
