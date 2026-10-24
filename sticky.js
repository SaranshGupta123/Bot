require("dotenv").config();

const { Client, GatewayIntentBits } = require("discord.js");
const fs = require("fs");

const DB_FILE = "./stickies.json";
let stickies = {};

const timeouts = {};

if (fs.existsSync(DB_FILE)) {
  stickies = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
}

function saveStickies() {
  fs.writeFileSync(DB_FILE, JSON.stringify(stickies, null, 2));
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once("clientReady", () => {
  console.log(`✅ Logged in as ${client.user.tag}!`);
  console.log("✅ Prefix commands active! Use !stickstart and !stickstop");
});

// Handle prefix commands and sticky messages
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  // !stickstart / !stickstop
  if (message.content.startsWith("!")) {
    const args = message.content.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === "stickstart") {
      let content = args.join(" ");

      if (!content) {
        return message.reply(
          "⚠️ Please provide a message to stick! Example: `!stickstart Read the rules!`",
        );
      }

      // Convert literal \n into real line breaks
      content = content.replace(/\\n/g, "\n");

      const stickyMsg = await message.channel.send(content);

      stickies[message.channelId] = {
        content: content,
        lastMessageId: stickyMsg.id,
      };

      saveStickies();

      try {
        await message.delete();
      } catch (error) {}

      const confirmMsg = await message.channel.send(
        "✅ Sticky message started!",
      );

      setTimeout(() => confirmMsg.delete().catch(() => {}), 5000);

      return;
    }

    if (command === "stickstop") {
      if (stickies[message.channelId]) {
        const lastId = stickies[message.channelId].lastMessageId;

        delete stickies[message.channelId];
        saveStickies();

        if (timeouts[message.channelId]) {
          clearTimeout(timeouts[message.channelId]);
          delete timeouts[message.channelId];
        }

        try {
          const oldMsg = await message.channel.messages.fetch(lastId);
          if (oldMsg) await oldMsg.delete();
        } catch (error) {}

        try {
          await message.delete();
        } catch (error) {}

        const confirmMsg = await message.channel.send(
          "🛑 Sticky message stopped.",
        );

        setTimeout(() => confirmMsg.delete().catch(() => {}), 5000);
      } else {
        const confirmMsg = await message.channel.send(
          "No active sticky message in this channel.",
        );

        setTimeout(() => confirmMsg.delete().catch(() => {}), 5000);
      }

      return;
    }
  }

  // Sticky reposting
  const stickyData = stickies[message.channelId];

  if (!stickyData) return;

  if (timeouts[message.channelId]) {
    clearTimeout(timeouts[message.channelId]);
  }

  timeouts[message.channelId] = setTimeout(async () => {
    try {
      const oldMsg = await message.channel.messages.fetch(
        stickyData.lastMessageId,
      );

      if (oldMsg) await oldMsg.delete();
    } catch (error) {}

    try {
      const newMsg = await message.channel.send(stickyData.content);

      stickies[message.channelId].lastMessageId = newMsg.id;

      saveStickies();
    } catch (error) {
      console.error("Failed to send sticky message:", error);
    }

    delete timeouts[message.channelId];
  }, 2000);
});

// Login using .env
client.login(process.env.DISCORD_TOKEN);
