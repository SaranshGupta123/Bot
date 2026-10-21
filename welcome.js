require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  PermissionsBitField,
} = require("discord.js");

// Intents are required to read messages and detect when members join
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers, // Privileged intent (must be enabled in developer portal)
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// MOCK DATABASE: Stores { GuildID: ChannelID }
// NOTE: For a public bot, replace this Map with MongoDB, SQLite, or quick.db
const serverWelcomeChannels = new Map();

client.once("clientReady", () => {
  console.log(`✅ Logged in as ${client.user.tag}!`);
});

// --- COMMAND TO SET THE WELCOME CHANNEL ---
client.on("messageCreate", async (message) => {
  // Ignore bots and DMs
  if (!message.guild || message.author.bot) return;

  // Command: !setwelcome #channel
  if (message.content.startsWith("!welcome")) {
    // Ensure only admins/managers can set this up
    if (
      !message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)
    ) {
      return message.reply(
        "❌ You need the **Manage Server** permission to set the welcome channel.",
      );
    }

    // Check if a channel was mentioned
    const targetChannel = message.mentions.channels.first();
    if (!targetChannel) {
      return message.reply(
        "⚠️ Please mention a valid channel. Usage: `!welcome #channel-name`",
      );
    }

    // Save the channel ID to the "database"
    serverWelcomeChannels.set(message.guild.id, targetChannel.id);

    return message.reply(
      `✅ The welcome channel for this server has been set to ${targetChannel}!`,
    );
  }
});

// --- EVENT: WHEN A MEMBER JOINS ---
client.on("guildMemberAdd", async (member) => {
  // 1. Look up the saved channel ID for this specific server
  const channelId = serverWelcomeChannels.get(member.guild.id);
  if (!channelId) return; // If the server hasn't set up a channel, do nothing

  // 2. Fetch the actual channel object
  const welcomeChannel = member.guild.channels.cache.get(channelId);
  if (!welcomeChannel) return;

  // 3. Create a professional welcome embed
  const welcomeEmbed = new EmbedBuilder()
    .setColor("#00FF00")
    .setTitle(`Welcome to ${member.guild.name}!`)
    .setDescription(
      `Hey ${member}, we're glad to have you here. You are our **${member.guild.memberCount}th** member!`,
    )
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
    .setFooter({ text: "User Joined", iconURL: member.guild.iconURL() })
    .setTimestamp();

  // 4. Send the message
  welcomeChannel.send({ embeds: [welcomeEmbed] }).catch((err) => {
    console.error(
      `Failed to send welcome message in ${member.guild.name}:`,
      err,
    );
  });
});

// Replace with your actual bot token
client.login(process.env.DISCORD_TOKEN);
