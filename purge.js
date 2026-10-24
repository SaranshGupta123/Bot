require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
} = require("discord.js");

// Initialize the client with required intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const PREFIX = "!";

client.on("clientReady", () => {
  console.log(`Logged in as ${client.user.tag}!`);
  console.log("Ready to purge messages.");
});

client.on("messageCreate", async (message) => {
  // Ignore messages from bots or without the prefix
  if (!message.content.startsWith(PREFIX) || message.author.bot) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  if (command === "purge") {
    // Check if the user has permission
    if (
      !message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)
    ) {
      return message.reply("You do not have permission to delete messages.");
    }

    // Validate the amount
    const amount = parseInt(args[0]);

    if (isNaN(amount)) {
      return message.reply("Please provide a valid number. Usage: `!purge 10`");
    }

    if (amount < 1 || amount > 99) {
      return message.reply("You must input a number between 1 and 99.");
    }

    try {
      // +1 to also delete the !purge command
      const deletedMessages = await message.channel.bulkDelete(
        amount + 1,
        true,
      );

      const reply = await message.channel.send(
        `Successfully deleted ${deletedMessages.size - 1} messages.`,
      );

      setTimeout(() => {
        reply.delete().catch(() => {});
      }, 3000);
    } catch (error) {
      console.error(error);

      message.channel.send(
        "There was an error trying to purge messages in this channel.",
      );
    }
  }
});

// Login using DISCORD_TOKEN1 from .env
client.login(process.env.DISCORD_TOKEN1);
