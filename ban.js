require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
  ],
});

const PREFIX = "!";

client.once("clientReady", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  console.log("🚀 Ban system ready!");
});

client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.guild) return;

  if (!message.content.toLowerCase().startsWith(`${PREFIX}ban`)) {
    return;
  }

  const args = message.content.trim().split(/\s+/);
  const userId = args[1];

  // Check permission
  if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
    return message.reply(
      "❌ You need the **Ban Members** permission to use this command.",
    );
  }

  // Check ID
  if (!userId) {
    return message.reply(
      "❌ Please provide a Discord User ID.\n\n" +
        "**Example:**\n" +
        "`!ban 123456789012345678`",
    );
  }

  // Validate Discord snowflake
  if (!/^\d{17,20}$/.test(userId)) {
    return message.reply("❌ That doesn't look like a valid Discord User ID.");
  }

  try {
    // Ban by ID.
    // The user does NOT need to be in the server.
    await message.guild.bans.create(userId, {
      reason: `Banned by ${message.author.tag}`,
    });

    return message.reply(
      `🔨 **User banned successfully!**\n\n` +
        `👤 User ID: \`${userId}\`\n` +
        `📌 Server: **${message.guild.name}**`,
    );
  } catch (error) {
    console.error("❌ Ban error:", error);

    if (error.code === 50013) {
      return message.reply(
        "❌ I don't have permission to ban users. Make sure my bot role has **Ban Members**.",
      );
    }

    if (error.code === 10013) {
      return message.reply("❌ Invalid user ID.");
    }

    return message.reply(
      `❌ Failed to ban the user.\n` +
        `Error: \`${error.message || "Unknown error"}\``,
    );
  }
});

client.login(process.env.DISCORD_TOKEN);
