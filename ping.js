require("dotenv").config();

const { Client, GatewayIntentBits, Partials, Events } = require("discord.js");

const fs = require("fs");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.Channel, Partials.Message],
});

const dbFile = "./pingchannels.json";

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
  console.log(`🟢 Ping bot logged in as ${c.user.tag}`);
});

// ========================================
// PING COMMANDS
// ========================================

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot || !message.guild) return;

  // !setwelcome
  if (message.content.startsWith("!setwelcome")) {
    if (!message.member.permissions.has("Administrator")) {
      return message.reply(
        "❌ You need Administrator permissions to use `!setwelcome`.",
      );
    }

    const targetChannel = message.mentions.channels.first();

    if (!targetChannel) {
      return message.reply(
        "⚠️ Please mention a channel.\nUsage: `!setwelcome #channel`",
      );
    }

    saveChannel(message.guild.id, targetChannel.id);

    return message.reply(`✅ Welcome ping channel set to ${targetChannel}.`);
  }

  // !disableping
  if (message.content === "!disableping") {
    if (!message.member.permissions.has("Administrator")) {
      return message.reply(
        "❌ You need Administrator permissions to use `!disableping`.",
      );
    }

    const data = getChannels();

    if (!data[message.guild.id]) {
      return message.reply("⚠️ Welcome pings are already disabled.");
    }

    disableChannel(message.guild.id);

    return message.reply("✅ Welcome pings have been disabled.");
  }
});

// ========================================
// MEMBER JOIN PING
// ========================================

client.on(Events.GuildMemberAdd, async (member) => {
  const data = getChannels();

  const channelId = data[member.guild.id];

  if (!channelId) return;

  const channel = member.guild.channels.cache.get(channelId);

  if (!channel) {
    console.log(`⚠️ Saved ping channel not found in ${member.guild.name}`);
    return;
  }

  try {
    const welcomeMessage = await channel.send(
      `Hey <@${member.id}>! 👋 Welcome to **${member.guild.name}**!`,
    );

    setTimeout(() => {
      welcomeMessage.delete().catch(() => {});
    }, 20000);
  } catch (error) {
    console.error("❌ Error sending welcome ping:", error);
  }
});

client.login(process.env.DISCORD_TOKEN1);
