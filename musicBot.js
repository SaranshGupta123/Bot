const { Client, GatewayIntentBits, ChannelType } = require("discord.js");
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  NoSubscriberBehavior,
  entersState,
} = require("@discordjs/voice");
const fs = require("fs");

const config = require("./config.js");

// Set your prefix here
const PREFIX = "!";

// Load Whitelist Database
let whitelist = {};
if (fs.existsSync("./whitelist.json")) {
  whitelist = JSON.parse(fs.readFileSync("./whitelist.json"));
}

function saveWhitelist() {
  fs.writeFileSync("./whitelist.json", JSON.stringify(whitelist, null, 4));
}

// Permission checking logic
function isAuthorized(userId, guildId) {
  // Check if the user is inside the ownerIDs array
  if (config.ownerIDs.includes(userId)) return true; // Owners ALWAYS have access

  if (!whitelist[guildId]) return false;
  return whitelist[guildId].includes(userId);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages, // Required for reading messages
    GatewayIntentBits.MessageContent, // Required for reading message content (prefix commands)
  ],
});

// Store active streams to manage 24/7 playback
const activeStreams = new Map();

client.once("clientReady", async () => {
  console.log(`🎵 Logged in as ${client.user.tag}`);
  console.log(`Ready to receive commands with prefix: ${PREFIX}`);
});

// Function to handle the Playlist stream
function playLofi(guildId, voiceChannel) {
  const connection = joinVoiceChannel({
    channelId: voiceChannel.id,
    guildId: guildId,
    adapterCreator: voiceChannel.guild.voiceAdapterCreator,
    selfDeaf: true,
  });

  const player = createAudioPlayer({
    behaviors: { noSubscriber: NoSubscriberBehavior.Play },
  });

  // Keep track of which song is currently playing
  let currentIndex = 0;

  const startStream = () => {
    try {
      // Grab the current song from your config playlist
      const currentSong = config.playlist[currentIndex];
      console.log(
        `[${guildId}] Playing track ${currentIndex + 1} out of${config.playlist.length}...`,
      );

      const resource = createAudioResource(currentSong);
      player.play(resource);
    } catch (err) {
      console.error("Stream Error:", err.message);
    }
  };

  startStream();
  connection.subscribe(player);
  activeStreams.set(guildId, { connection, player, voiceChannel });

  // RECONNECTION LOGIC: Force the bot to stay in the VC unless !stop is used
  connection.on(
    VoiceConnectionStatus.Disconnected,
    async (oldState, newState) => {
      try {
        // Wait to see if the connection is just moving channels or having a micro-drop
        await Promise.race([
          entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
          entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
        ]);
      } catch (error) {
        // If it doesn't automatically recover, force a manual reconnect
        if (activeStreams.has(guildId)) {
          console.log(
            `[${guildId}] Unexpectedly disconnected. Forcing reconnect to ${voiceChannel.name}...`,
          );
          connection.destroy();
          playLofi(guildId, voiceChannel); // Restart the entire session
        }
      }
    },
  );

  // PLAYLIST LOGIC: What to do when a song finishes playing
  player.on(AudioPlayerStatus.Idle, () => {
    console.log(`Track finished in ${guildId}. Moving to the next song...`);

    // Move to the next song in the list
    currentIndex++;

    // If we reached the end of the playlist, loop back to the beginning!
    if (currentIndex >= config.playlist.length) {
      currentIndex = 0;
    }

    startStream();
  });

  player.on("error", (error) => {
    console.error(`Error in audio player for guild ${guildId}:`, error.message);

    // If a song errors out, skip to the next one
    currentIndex++;
    if (currentIndex >= config.playlist.length) currentIndex = 0;
    startStream();
  });
}

// Change to messageCreate for prefix commands
client.on("messageCreate", async (message) => {
  // Ignore bot messages and messages outside of guilds
  if (message.author.bot || !message.guild) return;
  // Ignore messages that don't start with the prefix
  if (!message.content.startsWith(PREFIX)) return;

  // Split the message into command and arguments
  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();

  const guildId = message.guild.id;
  const user = message.author;

  // 1. SECURITY CHECK: Ensure user has access
  if (!isAuthorized(user.id, guildId)) {
    // Note: Standard messages cannot be ephemeral, so it will just reply normally
    return message.reply(
      "❌ You do not have permission to control this bot in this server.",
    );
  }

  if (commandName === "lofi") {
    const voiceChannel = message.member.voice.channel;

    if (!voiceChannel) {
      return message.reply("You need to be in a voice channel first!");
    }

    // CHECK: Reject stage channels entirely
    if (voiceChannel.type !== ChannelType.GuildVoice) {
      return message.reply(
        "❌ I can only join standard Voice Channels, not Stage Channels!",
      );
    }

    playLofi(guildId, voiceChannel);

    await message.reply(
      `🎧 Joined **${voiceChannel.name}** and starting 24/7 Lofi stream. I will stay here until someone runs \`${PREFIX}stop\`.`,
    );
  }

  if (commandName === "stop") {
    const streamInfo = activeStreams.get(guildId);
    if (streamInfo) {
      // Remove it from activeStreams FIRST so the disconnect event knows it was intentional
      activeStreams.delete(guildId);

      streamInfo.player.stop();
      streamInfo.connection.destroy();

      await message.reply(
        "🛑 Stopped the music and intentionally left the channel.",
      );
    } else {
      await message.reply(
        "I am not currently playing anything in this server.",
      );
    }
  }

  if (commandName === "grant") {
    // Check if they mentioned a user (e.g. !grant @user)
    const targetUser = message.mentions.users.first();

    if (!targetUser) {
      return message.reply(
        `Please mention a user! Example: \`${PREFIX}grant @username\``,
      );
    }

    if (!whitelist[guildId]) whitelist[guildId] = [];

    if (!whitelist[guildId].includes(targetUser.id)) {
      whitelist[guildId].push(targetUser.id);
      saveWhitelist();
      await message.reply(
        `✅ Granted access to **${targetUser.tag}**. They can now use the bot in this server.`,
      );
    } else {
      await message.reply(
        `**${targetUser.tag}** already has access in this server.`,
      );
    }
  }

  if (commandName === "revoke") {
    const targetUser = message.mentions.users.first();

    if (!targetUser) {
      return message.reply(
        `Please mention a user! Example: \`${PREFIX}revoke @username\``,
      );
    }

    // Prevent revoking any ID that is inside the ownerIDs array
    if (config.ownerIDs.includes(targetUser.id)) {
      return message.reply("❌ You cannot revoke a bot owner's access!");
    }

    if (whitelist[guildId] && whitelist[guildId].includes(targetUser.id)) {
      whitelist[guildId] = whitelist[guildId].filter(
        (id) => id !== targetUser.id,
      );
      saveWhitelist();
      await message.reply(`🚫 Revoked access from **${targetUser.tag}**.`);
    } else {
      await message.reply(`**${targetUser.tag}** does not have access here.`);
    }
  }
});

client.login(config.token);
