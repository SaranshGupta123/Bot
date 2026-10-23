require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  SlashCommandBuilder,
  REST,
  Routes,
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// --- COMMAND DATA ---
const commandCategories = {
  "🎵 Music": [
    {
      name: "`/lofi`",
      value:
        "Starts playing 24/7 Lofi music in your voice channel.\n**Example:** `/lofi`",
    },
    {
      name: "`/stop`",
      value: "Stops the music and disconnects the bot.\n**Example:** `/stop`",
    },
  ],

  "🛠️ Utilities": [
    {
      name: "`/poll`",
      value:
        "Create a beautiful embedded poll.\n**Example:** `/poll question:Best Game? option1:Valorant option2:Minecraft`",
    },
    {
      name: "`!vanity`",
      value: "Shows the server's custom vanity URL.\n**Example:** `!vanity`",
    },
    {
      name: "`!find <channel-name>`",
      value: "Search for a channel by name.\n**Example:** `!find general`",
    },
  ],

  "🎉 Community & Giveaways": [
    {
      name: "`!giveaway <time> <prize>`",
      value:
        "Start a giveaway in the current channel.\n**Examples:**\n`!giveaway 10m Discord Nitro`\n`!giveaway 1h ₹500 Gift Card`\n`!giveaway 1d Steam Key`",
    },
    {
      name: "`!stickstart <message>`",
      value:
        "Attach a sticky message to the bottom of a channel.\n**Example:** `!stickstart Please read the rules!`",
    },
  ],

  "⚙️ Administration": [
    {
      name: "`/setup`",
      value:
        "Setup the tag, roles, and message channel for this server.\n**Example:** `/setup tag:♡ role1:@Fan channel:#welcome`",
    },
    {
      name: "`/grant`",
      value:
        "Grant a user access to use the bot.\n**Example:** `/grant user:@Saransh`",
    },
  ],

  "🛡️ Anti-Nuke Protection": [
    {
      name: "`!antinuke setup #channel`",
      value:
        "Set the security logs channel.\n**Example:** `!antinuke setup #security-logs`",
    },
    {
      name: "`!antinuke whitelist add @user`",
      value:
        "Add a user to the anti-nuke whitelist.\n**Example:** `!antinuke whitelist add @User`",
    },
    {
      name: "`!antinuke whitelist remove @user`",
      value:
        "Remove a user from the anti-nuke whitelist.\n**Example:** `!antinuke whitelist remove @User`",
    },
    {
      name: "`!antinuke whitelist addbots`",
      value:
        "Whitelist all bots in the server.\n**Example:** `!antinuke whitelist addbots`",
    },
    {
      name: "`!antinuke whitelist removebots`",
      value:
        "Remove all bots from the anti-nuke whitelist.\n**Example:** `!antinuke whitelist removebots`",
    },
    {
      name: "`!antinuke dc @user`",
      value:
        "Disconnect a user from voice chat.\n**Example:** `!antinuke dc @User`",
    },
    {
      name: "`!antinuke t @user 10m`",
      value: "Timeout a user.\n**Example:** `!antinuke t @User 10m`",
    },
    {
      name: "`!antinuke b @user`",
      value: "Ban a user.\n**Example:** `!antinuke b @User`",
    },
    {
      name: "`!antinuke k @user`",
      value: "Kick a user.\n**Example:** `!antinuke k @User`",
    },
  ],

  "👋 Welcome": [
    {
      name: "`!welcome #channel`",
      value:
        "Set the channel where welcome embeds will be sent.\n**Example:** `!welcome #welcome`",
    },
    {
      name: "`!disablewelcome`",
      value:
        "Disable the welcome embed system for the server.\n**Example:** `!disablewelcome`",
    },
    {
      name: "`!welcomestatus`",
      value:
        "Check whether the welcome embed system is enabled and which channel is configured.\n**Example:** `!welcomestatus`",
    },
    {
      name: "`!setwelcome #channel`",
      value:
        "Set the channel where new-member welcome pings will be sent.\n**Example:** `!setwelcome #welcome`",
    },
    {
      name: "`!disableping`",
      value:
        "Disable the new-member welcome ping system.\n**Example:** `!disableping`",
    },
  ],

  "👋 Member Leaves": [
    {
      name: "`/setup-leaves #channel`",
      value:
        "Set the channel where member leave notifications will be sent.\n**Example:** `/setup-leaves channel:#leave-logs`",
    },
    {
      name: "`📤 Automatic Leave Tracker`",
      value:
        "Automatically sends a leave notification when a member leaves the server. The message includes their username, user ID, join date, avatar, and server information.",
    },
  ],

  "📢 Member Join": [
    {
      name: "`!setwelcome #channel`",
      value:
        "Configure the channel for temporary welcome pings when a new member joins.\n**Example:** `!setwelcome #welcome`",
    },
    {
      name: "`!disableping`",
      value: "Disable temporary welcome pings.\n**Example:** `!disableping`",
    },
    {
      name: "`👋 Automatic Welcome`",
      value:
        "When a member joins, the bot sends a welcome message and automatically removes the ping message after 20 seconds.",
    },
  ],
};

// --- HELPER FUNCTION: BUILD EMBED ---
function generateHelpEmbed(user, botAvatarURL) {
  const embed = new EmbedBuilder()
    .setColor("#2b2d31")
    .setTitle("✨ Bot Command Dashboard")
    .setDescription(
      "Welcome to the help center! Below is a categorized list of all available commands, how to use them, and examples.",
    )
    .setThumbnail(botAvatarURL)
    .setFooter({
      text: `Requested by ${user.tag}`,
      iconURL: user.displayAvatarURL({ dynamic: true }),
    })
    .setTimestamp();

  // Combine commands per category into 1 field each (7 fields total)
  for (const [category, commands] of Object.entries(commandCategories)) {
    const categoryContent = commands
      .map((cmd) => `${cmd.name}\n${cmd.value}`)
      .join("\n\n");

    embed.addFields({
      name: category,
      value: categoryContent,
      inline: false,
    });
  }

  return embed;
}

// --- REGISTER SLASH COMMAND ---
const helpCommand = new SlashCommandBuilder()
  .setName("help")
  .setDescription("Displays the help dashboard with all commands and examples");

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

client.once("clientReady", async () => {
  console.log(`🤖 Logged in as ${client.user.tag}!`);

  try {
    console.log("Refreshing application (/) commands...");
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID1), {
      body: [helpCommand.toJSON()],
    });
    console.log("Successfully reloaded commands.");
  } catch (error) {
    console.error(error);
  }
});

// --- PREFIX COMMAND HANDLER ($help) ---
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const content = message.content.toLowerCase().trim();
  if (content === "$help") {
    const helpEmbed = generateHelpEmbed(
      message.author,
      client.user.displayAvatarURL(),
    );
    await message.reply({ embeds: [helpEmbed] });
  }
});

// --- SLASH COMMAND HANDLER (/help) ---
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "help") {
    const helpEmbed = generateHelpEmbed(
      interaction.user,
      client.user.displayAvatarURL(),
    );
    await interaction.reply({ embeds: [helpEmbed] });
  }
});

client.login(process.env.TOKEN);
