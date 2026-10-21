require("dotenv").config();

const { Client, GatewayIntentBits, Partials, Events } = require("discord.js");
const fs = require("fs");

// 1. Initialize the client with required intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers, // Crucial for detecting new joins
  ],
  partials: [Partials.Channel, Partials.Message],
});

// 2. Simple database setup (saves channel settings to a JSON file)
const dbFile = "./channels.json";
if (!fs.existsSync(dbFile)) {
  fs.writeFileSync(dbFile, "{}");
}

function getChannels() {
  return JSON.parse(fs.readFileSync(dbFile, "utf-8"));
}

function saveChannel(guildId, channelId) {
  const data = getChannels();
  data[guildId] = channelId;
  fs.writeFileSync(dbFile, JSON.stringify(data, null, 2));
}

// 3. Bot is online
client.once(Events.ClientReady, (c) => {
  console.log(`Ready! Logged in as ${c.user.tag}`);
});

// 4. Configuration command: Let server admins set the channel
client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot || !message.guild) return;

  if (message.content.startsWith("!setwelcome")) {
    // Check for admin permissions
    if (!message.member.permissions.has("Administrator")) {
      return message.reply(
        "You need Administrator permissions to set the welcome channel.",
      );
    }

    // Find the mentioned channel
    const targetChannel = message.mentions.channels.first();
    if (!targetChannel) {
      return message.reply(
        "Please mention a channel! Usage: `!setwelcome #channel-name`",
      );
    }

    // Save the setting for this specific server
    saveChannel(message.guild.id, targetChannel.id);
    return message.reply(
      `Done! I will now ping new members in ${targetChannel}.`,
    );
  }
});

// 5. Trigger when a user joins the server
client.on(Events.GuildMemberAdd, async (member) => {
  const data = getChannels();
  const channelId = data[member.guild.id];

  if (!channelId) return; // Server hasn't set up a channel yet

  const channel = member.guild.channels.cache.get(channelId);
  if (!channel) return; // The saved channel might have been deleted

  try {
    // Send the ping
    const welcomeMessage = await channel.send(`Hey <@${member.id}>!`);

    // Automatically delete the message after 20 seconds (20000 milliseconds)
    setTimeout(() => {
      welcomeMessage.delete().catch(console.error); // catch prevents crashes if the message is already deleted
    }, 20000);
  } catch (error) {
    console.error("Error sending or deleting message:", error);
  }
});

// Log in
client.login(process.env.DISCORD_TOKEN1);
