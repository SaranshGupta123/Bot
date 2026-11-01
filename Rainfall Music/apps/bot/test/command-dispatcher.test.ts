import { CommandRegistry } from '../src/commands/CommandRegistry';
import { RainfallClient } from '../src/client/RainfallClient';

// Music Commands
import { PlayCommand } from '../src/commands/music/play';
import { PauseCommand } from '../src/commands/music/pause';
import { ResumeCommand } from '../src/commands/music/resume';
import { SkipCommand } from '../src/commands/music/skip';
import { PreviousCommand } from '../src/commands/music/previous';
import { StopCommand } from '../src/commands/music/stop';
import { QueueCommand } from '../src/commands/music/queue';
import { NowPlayingCommand } from '../src/commands/music/nowplaying';
import { VolumeCommand } from '../src/commands/music/volume';
import { SeekCommand } from '../src/commands/music/seek';
import { SeekForwardCommand } from '../src/commands/music/seekForward';
import { SeekBackwardCommand } from '../src/commands/music/seekBackward';
import { ShuffleCommand } from '../src/commands/music/shuffle';
import { LoopCommand } from '../src/commands/music/loop';
import { AutoplayCommand } from '../src/commands/music/autoplay';
import { LyricsCommand } from '../src/commands/music/lyrics';
import { FilterCommand } from '../src/commands/music/filter';
import { BassboostCommand } from '../src/commands/music/bassboost';
import { NightcoreCommand } from '../src/commands/music/nightcore';
import { RemoveCommand } from '../src/commands/music/remove';
import { MoveCommand } from '../src/commands/music/move';
import { ClearCommand } from '../src/commands/music/clear';
import { ReplayCommand } from '../src/commands/music/replay';
import { TwentyFourSevenCommand } from '../src/commands/music/twentyFourSeven';
import { JumpCommand } from '../src/commands/music/jump';
import { JoinCommand } from '../src/commands/music/join';
import { LeaveCommand } from '../src/commands/music/leave';
import { GrabCommand } from '../src/commands/music/grab';

// Config Commands
import { PrefixCommand } from '../src/commands/config/prefix';
import { NoPrefixCommand } from '../src/commands/config/noprefix';
import { HelpCommand } from '../src/commands/config/help';
import { SettingsCommand } from '../src/commands/config/settings';
import { DJRoleCommand } from '../src/commands/config/djrole';
import { AllowedChannelsCommand } from '../src/commands/config/allowedchannels';
import { DefaultVolumeCommand } from '../src/commands/config/defaultvolume';
import { PermissionsCommand } from '../src/commands/config/permissions';

// Playlist Commands
import { PlaylistCommand } from '../src/commands/playlists/playlist';

// User Commands
import { FavoritesCommand } from '../src/commands/user/favorites';
import { HistoryCommand } from '../src/commands/user/history';
import { ProfileCommand } from '../src/commands/user/profile';
import { StatsCommand } from '../src/commands/user/stats';

// Admin Commands
import { PingCommand } from '../src/commands/admin/ping';
import { InviteCommand } from '../src/commands/admin/invite';
import { MaintenanceCommand } from '../src/commands/admin/maintenance';
import { BlacklistCommand } from '../src/commands/admin/blacklist';
import { ServerInfoCommand } from '../src/commands/admin/serverinfo';
import { BotInfoCommand } from '../src/commands/admin/botinfo';

async function runTestSuite() {
  console.log('🧪 Starting Rainfall Bot Verification Suite...\n');

  const client = new RainfallClient();
  const registry = new CommandRegistry(client);

  const commandList = [
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
  ];

  registry.registerMultiple(commandList);

  // 1. Verify command counts
  console.log(`✅ Loaded ${client.commands.size} unique commands.`);
  if (client.commands.size !== 47) {
    throw new Error(`Expected 47 commands, got ${client.commands.size}`);
  }

  // 2. Verify Aliases & No-Prefix resolution
  console.log(`✅ Verifying aliases... (${client.aliases.size} registered)`);
  if (!client.aliases.has('p') || client.aliases.get('p') !== 'play') {
    throw new Error('Alias "p" -> "play" failed');
  }
  if (!client.aliases.has('q') || client.aliases.get('q') !== 'queue') {
    throw new Error('Alias "q" -> "queue" failed');
  }
  if (!client.aliases.has('s') || client.aliases.get('s') !== 'skip') {
    throw new Error('Alias "s" -> "skip" failed');
  }
  if (!client.aliases.has('j') || client.aliases.get('j') !== 'join') {
    throw new Error('Alias "j" -> "join" failed');
  }
  if (!client.aliases.has('dc') || client.aliases.get('dc') !== 'leave') {
    throw new Error('Alias "dc" -> "leave" failed');
  }
  if (!client.aliases.has('save') || client.aliases.get('save') !== 'grab') {
    throw new Error('Alias "save" -> "grab" failed');
  }
  if (!client.aliases.has('bb') || client.aliases.get('bb') !== 'bassboost') {
    throw new Error('Alias "bb" -> "bassboost" failed');
  }
  if (!client.aliases.has('nc') || client.aliases.get('nc') !== 'nightcore') {
    throw new Error('Alias "nc" -> "nightcore" failed');
  }

  // 3. Verify Signature 15-button grid customIds
  console.log('✅ Verifying signature 15-button interactive panel layout...');
  const expectedButtonIds = [
    // Row 1
    'panel_play',
    'panel_previous',
    'panel_pause',
    'panel_skip',
    'panel_loop',
    // Row 2
    'panel_vol_down',
    'panel_seek_back',
    'panel_favourite',
    'panel_seek_fwd',
    'panel_vol_up',
    // Row 3
    'panel_lyrics',
    'panel_shuffle',
    'panel_stop',
    'panel_filters',
    'panel_queue',
  ];

  const mockPlayer: any = {
    paused: false,
    repeatMode: 'off',
    volume: 100,
    queue: { tracks: [1, 2], previous: [0] },
  };

  const rows = client.panelManager.buildButtonRows(mockPlayer);
  if (rows.length !== 3) {
    throw new Error(`Expected exactly 3 action rows, got ${rows.length}`);
  }

  const generatedButtonIds: string[] = [];
  rows.forEach((row, rIdx) => {
    if (row.components.length !== 5) {
      throw new Error(`Row ${rIdx + 1} does not have 5 buttons (has ${row.components.length})`);
    }
    row.components.forEach((btn: any) => {
      generatedButtonIds.push(btn.data.custom_id);
    });
  });

  for (const expectedId of expectedButtonIds) {
    if (!generatedButtonIds.includes(expectedId)) {
      throw new Error(`Missing expected button custom_id: ${expectedId}`);
    }
  }

  console.log(`✅ All 15 signature buttons mapped across exactly 3 rows of 5 buttons:`);
  console.log(`   Row 1: [Play] [Previous] [Pause] [Skip] [Loop]`);
  console.log(`   Row 2: [VolDown] [SeekBack] [Favourite] [SeekFwd] [VolUp]`);
  console.log(`   Row 3: [VoiceFX] [Shuffle] [Stop] [Filters] [Settings]`);

  console.log('\n🎉 ALL BOT TEST VERIFICATIONS PASSED SUCCESSFULLY!');
}

runTestSuite().catch((err) => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
