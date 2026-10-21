require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  PermissionsBitField,
  Events,
} = require("discord.js");

const fs = require("fs");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const dbFile = "./channels.json";

if (!fs.existsSync(dbFile)) {
  fs.writeFileSync(dbFile, "{}");
}

function getChannels() {
  try {
    return JSON.parse(fs.readFileSync(dbFile, "utf8"));
  } catch (error) {
    console.error("❌ Failed to read channels.json:", error);
    return {};
  }
}

function saveChannel(guildId, channelId) {
  const data = getChannels();

  data[guildId] = channelId;

  fs.writeFileSync(dbFile, JSON.stringify(data, null, 2));
}

function disableChannel(guildId) {
  const data = getChannels();

  delete data[guildId];

  fs.writeFileSync(dbFile, JSON.stringify(data, null, 2));
}

client.once(Events.ClientReady, (c) => {
  console.log(`🟢 Welcome bot logged in as ${c.user.tag}`);
});

// ========================================
// WELCOME COMMANDS
// ========================================

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot || !message.guild) return;

  // IMPORTANT:
  // Only EXACT !welcome command
  if (
    message.content === "!welcome" ||
    message.content.startsWith("!welcome ")
  ) {
    if (
      !message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)
    ) {
      return message.reply(
        "❌ You need **Manage Server** permission to use `!welcome`.",
      );
    }

    const targetChannel = message.mentions.channels.first();

    if (!targetChannel) {
      return message.reply(
        "⚠️ Please mention a channel.\n\nUsage: `!welcome #channel-name`",
      );
    }

    saveChannel(message.guild.id, targetChannel.id);

    return message.reply(
      `✅ Welcome embed channel has been set to ${targetChannel}!`,
    );
  }

  // !disablewelcome
  if (message.content === "!disablewelcome") {
    if (
      !message.member.permissions.has(PermissionsBitField.Flags.Administrator)
    ) {
      return message.reply(
        "❌ You need **Administrator** permission to use `!disablewelcome`.",
      );
    }

    const data = getChannels();

    if (!data[message.guild.id]) {
      return message.reply("⚠️ Welcome embeds are already disabled.");
    }

    disableChannel(message.guild.id);

    return message.reply("✅ Welcome embeds have been disabled.");
  }

  // !welcomestatus
  if (message.content === "!welcomestatus") {
    const data = getChannels();

    const channelId = data[message.guild.id];

    if (!channelId) {
      return message.reply("🔴 Welcome embed system is **disabled**.");
    }

    const channel = message.guild.channels.cache.get(channelId);

    if (!channel) {
      return message.reply(
        "⚠️ Welcome system is configured, but the saved channel no longer exists.",
      );
    }

    return message.reply(
      `🟢 Welcome embed system is **enabled** in ${channel}.`,
    );
  }
});

// ========================================
// MEMBER JOIN EVENT
// ========================================

client.on(Events.GuildMemberAdd, async (member) => {
  try {
    const data = getChannels();

    const channelId = data[member.guild.id];

    if (!channelId) return;

    const welcomeChannel = member.guild.channels.cache.get(channelId);

    if (!welcomeChannel) {
      console.log(`⚠️ Welcome channel not found for ${member.guild.name}`);
      return;
    }

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

    await welcomeChannel.send({
      content: `${member}`,
      embeds: [welcomeEmbed],
    });

    console.log(`👋 Welcomed ${member.user.tag} in ${member.guild.name}`);
  } catch (error) {
    console.error("❌ Error sending welcome embed:", error);
  }
});

client.login(process.env.DISCORD_TOKEN);
