require("dotenv").config();

const { Client, GatewayIntentBits } = require("discord.js");
const fs = require("fs");

const DB_FILE = "./stickies.json";

let stickies = {};
const timeouts = {};

// ===============================
// Load saved sticky messages
// ===============================
if (fs.existsSync(DB_FILE)) {
  try {
    stickies = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
  } catch (error) {
    console.error("❌ Failed to load stickies.json:", error);
    stickies = {};
  }
}

// ===============================
// Save sticky messages
// ===============================
function saveStickies() {
  fs.writeFileSync(DB_FILE, JSON.stringify(stickies, null, 2));
}

// ===============================
// Discord Client
// ===============================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// ===============================
// Bot Ready
// ===============================
client.once("clientReady", () => {
  console.log(`✅ Logged in as ${client.user.tag}!`);
  console.log("✅ Prefix commands active!");
  console.log("👉 Use !stickstart and !stickstop");
});

// ===============================
// Message Handler
// ===============================
client.on("messageCreate", async (message) => {
  // Ignore bots
  if (message.author.bot) return;

  const channelId = message.channelId;

  // =========================================================
  // PREFIX COMMANDS
  // =========================================================
  if (message.content.startsWith("!")) {
    const args = message.content.slice(1).trim().split(/ +/);

    const command = args.shift()?.toLowerCase();

    // =======================================================
    // !stickstart
    // =======================================================
    if (command === "stickstart") {
      let content = args.join(" ");

      if (!content) {
        return message.reply(
          "⚠️ Please provide a message to stick!\n" +
            "Example: `!stickstart Read the rules!`",
        );
      }

      // Convert literal \n into actual line breaks
      content = content.replace(/\\n/g, "\n");

      // If an old sticky exists, delete it first
      if (stickies[channelId]) {
        try {
          const oldSticky = await message.channel.messages.fetch(
            stickies[channelId].lastMessageId,
          );

          if (oldSticky) {
            await oldSticky.delete();
          }
        } catch (error) {
          // Old sticky may already be deleted
        }

        // Clear old timer
        if (timeouts[channelId]) {
          clearTimeout(timeouts[channelId]);
          delete timeouts[channelId];
        }
      }

      // Send new sticky
      const stickyMsg = await message.channel.send(content);

      // Save sticky
      stickies[channelId] = {
        content: content,
        lastMessageId: stickyMsg.id,
      };

      saveStickies();

      // Delete command message
      try {
        await message.delete();
      } catch (error) {}

      // Confirmation message
      const confirmMsg = await message.channel.send(
        "✅ Sticky message started!",
      );

      setTimeout(() => {
        confirmMsg.delete().catch(() => {});
      }, 5000);

      return;
    }

    // =======================================================
    // !stickstop
    // =======================================================
    if (command === "stickstop") {
      if (stickies[channelId]) {
        const lastId = stickies[channelId].lastMessageId;

        // Remove sticky from database
        delete stickies[channelId];
        saveStickies();

        // Cancel pending timer
        if (timeouts[channelId]) {
          clearTimeout(timeouts[channelId]);
          delete timeouts[channelId];
        }

        // Delete sticky message
        try {
          const oldMsg = await message.channel.messages.fetch(lastId);

          if (oldMsg) {
            await oldMsg.delete();
          }
        } catch (error) {
          // Message may already be deleted
        }

        // Delete !stickstop command
        try {
          await message.delete();
        } catch (error) {}

        // Confirmation
        const confirmMsg = await message.channel.send(
          "🛑 Sticky message stopped.",
        );

        setTimeout(() => {
          confirmMsg.delete().catch(() => {});
        }, 5000);
      } else {
        const confirmMsg = await message.channel.send(
          "⚠️ No active sticky message in this channel.",
        );

        setTimeout(() => {
          confirmMsg.delete().catch(() => {});
        }, 5000);
      }

      return;
    }
  }

  // =========================================================
  // STICKY REPOSTING
  // =========================================================

  const stickyData = stickies[channelId];

  // No sticky in this channel
  if (!stickyData) return;

  // ---------------------------------------------------------
  // IMPORTANT:
  // Cancel the previous timer.
  //
  // This means if:
  //
  // User A -> message
  // User B -> message
  // User C -> message
  //
  // the timer keeps getting reset.
  //
  // Sticky will only appear 2 seconds after the LAST message.
  // ---------------------------------------------------------
  if (timeouts[channelId]) {
    clearTimeout(timeouts[channelId]);
  }

  timeouts[channelId] = setTimeout(async () => {
    // Check if sticky still exists
    const currentSticky = stickies[channelId];

    if (!currentSticky) {
      delete timeouts[channelId];
      return;
    }

    // =======================================================
    // Delete previous sticky
    // =======================================================
    try {
      const oldMsg = await message.channel.messages.fetch(
        currentSticky.lastMessageId,
      );

      if (oldMsg) {
        await oldMsg.delete();
      }
    } catch (error) {
      // Old message may already be deleted
    }

    // =======================================================
    // Send sticky again
    // =======================================================
    try {
      const newMsg = await message.channel.send(currentSticky.content);

      // Make sure sticky wasn't stopped while sending
      if (stickies[channelId]) {
        stickies[channelId].lastMessageId = newMsg.id;
        saveStickies();
      }
    } catch (error) {
      console.error(`❌ Failed to send sticky message in ${channelId}:`, error);
    }

    // Remove timer reference
    delete timeouts[channelId];
  }, 2000);
});

// ===============================
// Login
// ===============================
client.login(process.env.DISCORD_TOKEN);
