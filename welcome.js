require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  PermissionsBitField,
  Events,
} = require("discord.js");

const fs = require("fs");

// ========================================
// DISCORD CLIENT
// ========================================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// ========================================
// DATABASE
// ========================================

const dbFile = "./channels.json";

// Create database if it doesn't exist
if (!fs.existsSync(dbFile)) {
  fs.writeFileSync(dbFile, "{}");
}

// Read database
function getChannels() {
  try {
    return JSON.parse(fs.readFileSync(dbFile, "utf8"));
  } catch (error) {
    console.error("❌ Failed to read channels.json:", error);
    return {};
  }
}

// Save welcome channel
function saveChannel(guildId, channelId) {
  const data = getChannels();

  data[guildId] = channelId;

  fs.writeFileSync(dbFile, JSON.stringify(data, null, 2));
}

// Disable welcome system
function disableChannel(guildId) {
  const data = getChannels();

  delete data[guildId];

  fs.writeFileSync(dbFile, JSON.stringify(data, null, 2));
}

// ========================================
// BOT READY
// ========================================

client.once(Events.ClientReady, (client) => {
  console.log(`✅ Logged in as ${client.user.tag}!`);
});

// ========================================
// COMMANDS
// ========================================

client.on(Events.MessageCreate, async (message) => {
  // Ignore bots and DMs
  if (message.author.bot || !message.guild) return;

  // ====================================
  // !welcome #channel
  // ====================================

  if (message.content.startsWith("!welcome")) {
    // Manage Server permission
    if (
      !message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)
    ) {
      return message.reply(
        "❌ You need the **Manage Server** permission to configure the welcome system.",
      );
    }

    // Find mentioned channel
    const targetChannel = message.mentions.channels.first();

    if (!targetChannel) {
      return message.reply(
        "⚠️ Please mention a channel.\n\nUsage: `!welcome #channel-name`",
      );
    }

    // Save channel
    saveChannel(message.guild.id, targetChannel.id);

    return message.reply(
      `✅ Welcome channel has been set to ${targetChannel}!`,
    );
  }

  // ====================================
  // !disablewelcome
  // ====================================

  if (message.content === "!disablewelcome") {
    // Administrator permission
    if (
      !message.member.permissions.has(PermissionsBitField.Flags.Administrator)
    ) {
      return message.reply(
        "❌ You need **Administrator** permission to disable the welcome system.",
      );
    }

    const data = getChannels();

    // Check whether welcome is enabled
    if (!data[message.guild.id]) {
      return message.reply("⚠️ Welcome messages are already disabled.");
    }

    // Remove server from database
    disableChannel(message.guild.id);

    return message.reply(
      "✅ Welcome messages have been disabled for this server.",
    );
  }

  // ====================================
  // !welcomestatus
  // ====================================

  if (message.content === "!welcomestatus") {
    const data = getChannels();

    const channelId = data[message.guild.id];

    if (!channelId) {
      return message.reply("🔴 Welcome system is currently **disabled**.");
    }

    const channel = message.guild.channels.cache.get(channelId);

    if (!channel) {
      return message.reply(
        "⚠️ Welcome system is configured, but the saved channel no longer exists.",
      );
    }

    return message.reply(`🟢 Welcome system is **enabled** in ${channel}.`);
  }
});

// ========================================
// MEMBER JOIN EVENT
// ========================================

client.on(Events.GuildMemberAdd, async (member) => {
  try {
    const data = getChannels();

    // Get configured channel for this server
    const channelId = data[member.guild.id];

    // Welcome system disabled
    if (!channelId) return;

    // Get channel
    const welcomeChannel = member.guild.channels.cache.get(channelId);

    // Channel deleted or unavailable
    if (!welcomeChannel) {
      console.log(`⚠️ Welcome channel not found for ${member.guild.name}`);
      return;
    }

    // ==================================
    // CREATE WELCOME EMBED
    // ==================================

    const welcomeEmbed = new EmbedBuilder()
      .setColor("#00FF00")
      .setTitle(`Welcome to ${member.guild.name}!`)
      .setDescription(
        `Hey ${member}, we're glad to have you here! 🎉\n\n` +
          `You are our **${member.guild.memberCount}th** member!`,
      )
      .setThumbnail(
        member.user.displayAvatarURL({
          extension: "png",
          size: 256,
        }),
      )
      .setFooter({
        text: "User Joined",
        iconURL: member.guild.iconURL(),
      })
      .setTimestamp();

    // ==================================
    // SEND WELCOME MESSAGE
    // ==================================

    await welcomeChannel.send({
      content: `${member}`,
      embeds: [welcomeEmbed],
    });

    console.log(`👋 Welcomed ${member.user.tag} in ${member.guild.name}`);
  } catch (error) {
    console.error("❌ Error sending welcome message:", error);
  }
});

// ========================================
// LOGIN
// ========================================

client.login(process.env.DISCORD_TOKEN);
