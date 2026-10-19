require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once("clientReady", () => {
  console.log(`✨ Logged in as ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  // Ignore bots
  if (message.author.bot) return;

  // Only work inside servers
  if (!message.guild) return;

  // Accept both "vanity" and "!vanity"
  const command = message.content.trim().toLowerCase();

  if (command !== "vanity" && command !== "!vanity") return;

  try {
    // Get the server vanity information
    const vanity = await message.guild.fetchVanityData();

    // Server doesn't have a vanity URL
    if (!vanity || !vanity.code) {
      return message.reply(
        "🌸 This server doesn't have a vanity URL yet. 🥺"
      );
    }

    const vanityURL = `https://discord.gg/${vanity.code}`;

    // Normal text message
    await message.reply(
      `The vanity link for this server is: **${vanityURL}**`
    );

  } catch (error) {
    console.error("Vanity error:", error);

    await message.reply(
      "🥺 I couldn't fetch the vanity link for this server right now."
    );
  }
});

client.login(process.env.DISCORD_TOKEN);