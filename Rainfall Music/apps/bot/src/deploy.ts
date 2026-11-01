import { RainfallClient } from './client/RainfallClient';
import { CommandRegistry } from './commands/CommandRegistry';
import { createScopedLogger } from '@rainfall/shared';

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

const log = createScopedLogger('DeployCommands');

async function deploy() {
  log.info('Initializing client and loading all command builders...');
  const client = new RainfallClient();
  const registry = new CommandRegistry(client);

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

    // Playlists (1 command)
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

  log.info(`Pushing ${client.commands.size} application commands to Discord REST API...`);
  await registry.deploySlashCommands();
  log.info('Slash command deployment completed successfully!');
  process.exit(0);
}

deploy().catch((err) => {
  log.error('Failed to deploy slash commands:', err);
  process.exit(1);
});
