// const {
//   Client,
//   GatewayIntentBits,
//   EmbedBuilder,
//   AttachmentBuilder,
// } = require("discord.js");
// const ms = require("ms");
// const fs = require("fs");
// const path = require("path");

// const client = new Client({
//   intents: [
//     GatewayIntentBits.Guilds,
//     GatewayIntentBits.GuildMessages,
//     GatewayIntentBits.MessageContent,
//     GatewayIntentBits.GuildMessageReactions,
//   ],
// });

// const PREFIX = "!";
// const GIVEAWAY_FILE = path.join(__dirname, "giveaways.json");

// // --- Helper Functions for File Storage ---
// function loadGiveaways() {
//   if (!fs.existsSync(GIVEAWAY_FILE)) {
//     fs.writeFileSync(GIVEAWAY_FILE, JSON.stringify([]));
//   }
//   const data = fs.readFileSync(GIVEAWAY_FILE);
//   return JSON.parse(data);
// }

// function saveGiveaways(data) {
//   fs.writeFileSync(GIVEAWAY_FILE, JSON.stringify(data, null, 2));
// }

// // --- Function to Handle Ending a Giveaway ---
// async function endGiveaway(client, giveaway) {
//   try {
//     const channel = await client.channels
//       .fetch(giveaway.channelId)
//       .catch(() => null);
//     if (!channel) return; // Channel was deleted

//     const message = await channel.messages
//       .fetch(giveaway.messageId)
//       .catch(() => null);
//     if (!message) return; // Message was deleted

//     const reaction = message.reactions.cache.get("🎉");
//     if (!reaction) return;

//     // Fetch all users who reacted
//     const users = await reaction.users.fetch();
//     const entries = users.filter((user) => !user.bot).map((user) => user);

//     if (entries.length === 0) {
//       await channel.send(
//         `Nobody entered the giveaway for **${giveaway.prize}**. 😢`,
//       );
//     } else {
//       // Pick a random winner
//       const winner = entries[Math.floor(Math.random() * entries.length)];
//       await channel.send(
//         `Congratulations ${winner}! You won the **${giveaway.prize}**! 🎉`,
//       );
//     }
//   } catch (error) {
//     console.error("Error ending giveaway:", error);
//   } finally {
//     // Remove the finished giveaway from the JSON file
//     const data = loadGiveaways();
//     const filteredData = data.filter((g) => g.messageId !== giveaway.messageId);
//     saveGiveaways(filteredData);
//   }
// }

// // --- Bot Events ---
// client.once("clientReady", () => {
//   console.log(`${client.user.tag} is online and ready for giveaways!`);

//   // Check for ongoing giveaways when the bot restarts
//   const giveaways = loadGiveaways();
//   const now = Date.now();

//   giveaways.forEach((giveaway) => {
//     if (giveaway.endsAt <= now) {
//       // Giveaway should have ended while the bot was offline
//       endGiveaway(client, giveaway);
//     } else {
//       // Giveaway is still ongoing, set a new timeout
//       const remainingTime = giveaway.endsAt - now;
//       setTimeout(() => endGiveaway(client, giveaway), remainingTime);
//     }
//   });
// });

// client.on("messageCreate", async (message) => {
//   if (message.author.bot || !message.content.startsWith(PREFIX)) return;

//   const args = message.content.slice(PREFIX.length).trim().split(/ +/);
//   const command = args.shift().toLowerCase();

//   if (command === "giveaway") {
//     const time = args[0];
//     const prize = args.slice(1).join(" ");

//     if (!time || !prize) {
//       return message.reply(
//         "**Usage:** `!giveaway <time> <prize>` (e.g., `!giveaway 5m Steam Key`)",
//       );
//     }

//     const duration = ms(time);
//     if (isNaN(duration)) {
//       return message.reply(
//         "Please provide a valid time format (e.g., 10s, 5m, 12h, 1d).",
//       );
//     }

//     const endsAt = Date.now() + duration;

//     // 1. Define the local file using AttachmentBuilder
//     // Make sure you have a folder named 'images' and a file named 'poll.gif' inside it!
//     const localGifPath = path.join(__dirname, "images", "poll.gif");

//     if (!fs.existsSync(localGifPath)) {
//       return message.reply(
//         "Error: I couldn't find the poll.gif file in the images folder!",
//       );
//     }

//     const file = new AttachmentBuilder(localGifPath, { name: "poll.gif" });

//     // 2. Create the giveaway embed and reference the attachment
//     const embed = new EmbedBuilder()
//       .setTitle("🎉 GIVEAWAY 🎉")
//       .setDescription(
//         `**Prize:** ${prize}\n**React with 🎉 to enter!**\n**Hosted by:** ${message.author}\n**Ends in:** <t:${Math.floor(endsAt / 1000)}:R>`,
//       )
//       .setColor("Blurple")
//       .setImage("attachment://poll.gif") // Refers to the name assigned in AttachmentBuilder
//       .setTimestamp(endsAt);

//     // 3. Send the message with BOTH the embed and the attached file
//     const giveawayMessage = await message.channel.send({
//       embeds: [embed],
//       files: [file],
//     });
//     await giveawayMessage.react("🎉");

//     // Save the giveaway to the JSON file
//     const giveawayData = {
//       messageId: giveawayMessage.id,
//       channelId: message.channel.id,
//       prize: prize,
//       endsAt: endsAt,
//     };

//     const giveaways = loadGiveaways();
//     giveaways.push(giveawayData);
//     saveGiveaways(giveaways);

//     // Set the timer for this session
//     setTimeout(() => {
//       endGiveaway(client, giveawayData);
//     }, duration);
//   }
// });

// // PLEASE USE A NEW TOKEN

// client.login("Discod Token Here");
require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  AttachmentBuilder,
} = require("discord.js");

const ms = require("ms");
const fs = require("fs");
const path = require("path");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
  ],
});

const PREFIX = "!";
const GIVEAWAY_FILE = path.join(__dirname, "giveaways.json");

// --- Helper Functions for File Storage ---
function loadGiveaways() {
  if (!fs.existsSync(GIVEAWAY_FILE)) {
    fs.writeFileSync(GIVEAWAY_FILE, JSON.stringify([]));
  }
  const data = fs.readFileSync(GIVEAWAY_FILE);
  return JSON.parse(data);
}

function saveGiveaways(data) {
  fs.writeFileSync(GIVEAWAY_FILE, JSON.stringify(data, null, 2));
}

// --- Function to Handle Ending a Giveaway ---
async function endGiveaway(client, giveaway) {
  try {
    const channel = await client.channels
      .fetch(giveaway.channelId)
      .catch(() => null);
    if (!channel) return;

    const message = await channel.messages
      .fetch(giveaway.messageId)
      .catch(() => null);
    if (!message) return;

    const reaction = message.reactions.cache.get("🎉");
    if (!reaction) return;

    const users = await reaction.users.fetch();
    const entries = users.filter((user) => !user.bot).map((user) => user);

    if (entries.length === 0) {
      await channel.send(
        `Nobody entered the giveaway for **${giveaway.prize}**. 😢`,
      );
    } else {
      const winner = entries[Math.floor(Math.random() * entries.length)];
      await channel.send(
        `Congratulations ${winner}! You won the **${giveaway.prize}**! 🎉`,
      );
    }
  } catch (error) {
    console.error("Error ending giveaway:", error);
  } finally {
    const data = loadGiveaways();
    const filteredData = data.filter((g) => g.messageId !== giveaway.messageId);
    saveGiveaways(filteredData);
  }
}

// --- Bot Events ---
client.once("clientReady", () => {
  console.log(`${client.user.tag} is online and ready for giveaways!`);

  const giveaways = loadGiveaways();
  const now = Date.now();

  giveaways.forEach((giveaway) => {
    if (giveaway.endsAt <= now) {
      endGiveaway(client, giveaway);
    } else {
      const remainingTime = giveaway.endsAt - now;
      setTimeout(() => endGiveaway(client, giveaway), remainingTime);
    }
  });
});

client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  if (command === "giveaway") {
    const time = args[0];
    const prize = args.slice(1).join(" ");

    if (!time || !prize) {
      return message.reply(
        "**Usage:** `!giveaway <time> <prize>` (e.g., `!giveaway 5m Steam Key`)",
      );
    }

    const duration = ms(time);
    if (isNaN(duration)) {
      return message.reply(
        "Please provide a valid time format (e.g., 10s, 5m, 12h, 1d).",
      );
    }

    const endsAt = Date.now() + duration;
    const localGifPath = path.join(__dirname, "images", "poll.gif");

    if (!fs.existsSync(localGifPath)) {
      return message.reply(
        "Error: I couldn't find the poll.gif file in the images folder!",
      );
    }

    const file = new AttachmentBuilder(localGifPath, { name: "poll.gif" });

    // --- UPGRADED, LARGER EMBED ---
    const embed = new EmbedBuilder()
      .setAuthor({
        name: `🎉 New Giveaway in ${message.guild.name}!`,
        iconURL:
          message.guild.iconURL({ dynamic: true }) ||
          client.user.displayAvatarURL(),
      })
      .setTitle(`🎁 Prize: ${prize}`)
      .setDescription(
        "> Click the **🎉 reaction** below to enter!\n> Make sure your DMs are open in case you win.",
      )
      .addFields(
        { name: "👑 Hosted By", value: `${message.author}`, inline: true },
        {
          name: "⏳ Ends In",
          value: `<t:${Math.floor(endsAt / 1000)}:R>`,
          inline: true,
        },
        { name: "🏆 Winners", value: "1", inline: true },
      )
      .setColor("#5865F2") // Standard Discord Blurple
      .setThumbnail(
        message.author.displayAvatarURL({ dynamic: true, size: 1024 }),
      ) // Adds a large thumbnail to stretch height/width
      .setImage("attachment://poll.gif") // Stretches the bottom of the embed based on GIF width
      .setFooter({
        text: `Giveaway ID: ${Date.now().toString().slice(-6)} • Good luck!`,
        iconURL: client.user.displayAvatarURL(),
      })
      .setTimestamp(endsAt);
    // --------------------------------

    const giveawayMessage = await message.channel.send({
      embeds: [embed],
      files: [file],
    });
    await giveawayMessage.react("🎉");

    const giveawayData = {
      messageId: giveawayMessage.id,
      channelId: message.channel.id,
      prize: prize,
      endsAt: endsAt,
    };

    const giveaways = loadGiveaways();
    giveaways.push(giveawayData);
    saveGiveaways(giveaways);

    setTimeout(() => {
      endGiveaway(client, giveawayData);
    }, duration);
  }
});

// REMINDER: Insert your BRAND NEW regenerated token here!
client.login(process.env.DISCORD_TOKEN);