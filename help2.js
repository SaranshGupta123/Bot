require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  SlashCommandBuilder,
  REST,
  Routes,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField,
} = require("discord.js");

// =====================================================
// CONFIG
// =====================================================

const BOT_TOKEN = process.env.DISCORD_TOKEN1;
const CLIENT_ID = process.env.CLIENT_ID;

if (!BOT_TOKEN) {
  console.error("❌ DISCORD_TOKEN1 is missing from .env");
  process.exit(1);
}

if (!CLIENT_ID) {
  console.error("❌ CLIENT_ID is missing from .env");
  process.exit(1);
}

// =====================================================
// CLIENT
// =====================================================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// =====================================================
// COMMAND DATA
// =====================================================

const commandCategories = {
  "🎵 Music": [
    {
      name: "`%lofi`",
      value:
        "Starts playing 24/7 Lofi music in your voice channel.\n**Example:** `%lofi`",
    },
    {
      name: "`%stop`",
      value: "Stops the music and disconnects the bot.\n**Example:** `%stop`",
    },
  ],

  "🛠️ Utilities": [
    {
      name: "`/poll`",
      value:
        "Create a beautiful embedded poll.\n**Example:** `/poll question:Best Game? option1:Valorant option2:Minecraft`",
    },
    {
      name: "`%vanity`",
      value: "Shows the server's custom vanity URL.\n**Example:** `%vanity`",
    },
    {
      name: "`%find <channel-name>`",
      value: "Search for a channel by name.\n**Example:** `%find general`",
    },
    {
      name: "`%commands`",
      value: "View the full list of commands across all bots.\n**Example:** `%commands`",
    },
  ],

  "🎉 Community & Giveaways": [
    {
      name: "`%giveaway <time> <prize>`",
      value:
        "Start a giveaway in the current channel.\n**Examples:**\n`%giveaway 10m Discord Nitro`\n`%giveaway 1h ₹500 Gift Card`\n`%giveaway 1d Steam Key`",
    },
    {
      name: "`%stickstart <message>`",
      value:
        "Attach a sticky message to the bottom of a channel.\n**Example:** `%stickstart Please read the rules!`",
    },
    {
      name: "`%stickstop`",
      value:
        "Stop the active sticky message in the current channel.\n**Example:** `%stickstop`",
    },
  ],

  "🧹 Moderation": [
    {
      name: "`%purge <amount>`",
      value:
        "Delete multiple messages from the current channel.\n**Example:** `%purge 10`\n\nRequires **Administrator** permission.",
    },
    {
      name: "`%purge 99`",
      value:
        "Delete up to 99 messages at once.\n\nMessages older than Discord's bulk-delete limit are automatically ignored.",
    },
    {
      name: "`%ban <userId>`",
      value:
        "Ban a user by Discord User ID.\n**Example:** `%ban 123456789012345678`\n\nRequires **Administrator** permission.",
    },
  ],

  "⚙️ Administration": [
    {
      name: "`%setup <roleId...> #channel`",
      value:
        "Setup the tag roles and announcement channel for this server.\n**Example:** `%setup 123456789012345678 #tag-log`",
    },
    {
      name: "`%grant @user`",
      value:
        "Grant a user access to use the MusicBot.\n**Example:** `%grant @Saransh`",
    },
  ],

  "🛡️ Anti-Nuke Protection": [
    {
      name: "`%antinuke setup #channel`",
      value:
        "Set the security logs channel.\n**Example:** `%antinuke setup #security-logs`",
    },
    {
      name: "`%antinuke whitelist add @user`",
      value:
        "Add a user to the anti-nuke whitelist.\n**Example:** `%antinuke whitelist add @User`",
    },
    {
      name: "`%antinuke whitelist remove @user`",
      value:
        "Remove a user from the anti-nuke whitelist.\n**Example:** `%antinuke whitelist remove @User`",
    },
    {
      name: "`%antinuke whitelist addbots`",
      value:
        "Whitelist all bots in the server.\n**Example:** `%antinuke whitelist addbots`",
    },
    {
      name: "`%antinuke whitelist removebots`",
      value:
        "Remove all bots from the anti-nuke whitelist.\n**Example:** `%antinuke whitelist removebots`",
    },
    {
      name: "`%antinuke dc @user`",
      value:
        "Disconnect a user from voice chat.\n**Example:** `%antinuke dc @User`",
    },
    {
      name: "`%antinuke t @user 10m`",
      value: "Timeout a user.\n**Example:** `%antinuke t @User 10m`",
    },
    {
      name: "`%antinuke b @user`",
      value: "Ban a user.\n**Example:** `%antinuke b @User`",
    },
    {
      name: "`%antinuke k @user`",
      value: "Kick a user.\n**Example:** `%antinuke k @User`",
    },
  ],

  "👋 Welcome": [
    {
      name: "`%welcome #channel`",
      value:
        "Set the channel where welcome embeds will be sent.\n**Example:** `%welcome #welcome`",
    },
    {
      name: "`%disablewelcome`",
      value:
        "Disable the welcome embed system for the server.\n**Example:** `%disablewelcome`",
    },
    {
      name: "`%welcomestatus`",
      value:
        "Check whether the welcome embed system is enabled and which channel is configured.\n**Example:** `%welcomestatus`",
    },
    {
      name: "`%setwelcome #channel`",
      value:
        "Set the channel where new-member welcome pings will be sent.\n**Example:** `%setwelcome #welcome`",
    },
    {
      name: "`%disableping`",
      value:
        "Disable the new-member welcome ping system.\n**Example:** `%disableping`",
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
      name: "`%setwelcome #channel`",
      value:
        "Configure the channel for temporary welcome pings when a new member joins.\n**Example:** `%setwelcome #welcome`",
    },
    {
      name: "`%disableping`",
      value: "Disable temporary welcome pings.\n**Example:** `%disableping`",
    },
    {
      name: "`👋 Automatic Welcome`",
      value:
        "When a member joins, the bot sends a welcome message and automatically removes the ping message after 20 seconds.",
    },
  ],
};

// =====================================================
// PAGINATION CONFIG
// =====================================================

// Number of categories displayed per page
const CATEGORIES_PER_PAGE = 2;

const categories = Object.entries(commandCategories);

const TOTAL_PAGES = Math.ceil(categories.length / CATEGORIES_PER_PAGE);

// =====================================================
// BUILD HELP EMBED
// =====================================================

function generateHelpEmbed(user, botAvatarURL, page) {
  const startIndex = page * CATEGORIES_PER_PAGE;

  const pageCategories = categories.slice(
    startIndex,
    startIndex + CATEGORIES_PER_PAGE,
  );

  const embed = new EmbedBuilder()
    .setColor("#2b2d31")
    .setTitle("✨ Bot Command Dashboard")
    .setDescription(
      "Welcome to the help center!\n\n" +
        "Below is a categorized list of available commands, " +
        "how to use them, and examples.",
    )
    .setThumbnail(botAvatarURL)
    .setFooter({
      text: `Requested by ${user.tag} • Page ${page + 1}/${TOTAL_PAGES}`,
      iconURL: user.displayAvatarURL({ dynamic: true }),
    })
    .setTimestamp();

  for (const [category, commands] of pageCategories) {
    const categoryContent = commands
      .map((cmd) => `${cmd.name}\n${cmd.value}`)
      .join("\n\n");

    embed.addFields({
      name: category,
      value: categoryContent.slice(0, 1024),
      inline: false,
    });
  }

  return embed;
}

// =====================================================
// PAGINATION BUTTONS
// =====================================================

function generatePaginationButtons(page) {
  const previousButton = new ButtonBuilder()
    .setCustomId(`help_previous_${page}`)
    .setLabel("Previous")
    .setEmoji("◀️")
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(page === 0);

  const pageButton = new ButtonBuilder()
    .setCustomId("help_current_page")
    .setLabel(`Page ${page + 1} / ${TOTAL_PAGES}`)
    .setStyle(ButtonStyle.Primary)
    .setDisabled(true);

  const nextButton = new ButtonBuilder()
    .setCustomId(`help_next_${page}`)
    .setLabel("Next")
    .setEmoji("▶️")
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(page === TOTAL_PAGES - 1);

  return new ActionRowBuilder().addComponents(
    previousButton,
    pageButton,
    nextButton,
  );
}

// =====================================================
// SEND HELP
// =====================================================

async function sendHelp(target, user) {
  const page = 0;

  const embed = generateHelpEmbed(user, client.user.displayAvatarURL(), page);

  const buttons = generatePaginationButtons(page);

  await target.reply({
    embeds: [embed],
    components: [buttons],
  });
}

// =====================================================
// SLASH COMMAND
// =====================================================

const helpCommand = new SlashCommandBuilder()
  .setName("help")
  .setDescription(
    "Displays the paginated help dashboard with all commands and examples",
  )
  .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
  .setDMPermission(false);

// =====================================================
// DISCORD REST API
// =====================================================

const rest = new REST({ version: "10" }).setToken(BOT_TOKEN);

// =====================================================
// BOT READY
// =====================================================

client.once("clientReady", async () => {
  console.log(`🤖 Logged in as ${client.user.tag}!`);
  console.log(`🆔 Application ID: ${CLIENT_ID}`);

  try {
    console.log("🔄 Refreshing application (/) commands...");

    await rest.put(Routes.applicationCommands(CLIENT_ID), {
      body: [helpCommand.toJSON()],
    });

    console.log("✅ Successfully reloaded slash commands.");
    console.log(`📚 Help dashboard contains ${TOTAL_PAGES} pages.`);
  } catch (error) {
    console.error("❌ Failed to register slash commands:");
    console.error(error);
  }
});

// =====================================================
// PREFIX COMMAND: %help
// =====================================================

client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.guild) return;

  const content = message.content.toLowerCase().trim();

  if (content === "%help") {
    if (
      !message.member?.permissions.has(PermissionsBitField.Flags.Administrator)
    ) {
      return message.reply(
        "❌ You need **Administrator** permission to use `%help`.",
      );
    }

    try {
      await sendHelp(message, message.author);
    } catch (error) {
      console.error("❌ Error sending %help:", error);
    }
  }
});

// =====================================================
// INTERACTIONS
// =====================================================

client.on("interactionCreate", async (interaction) => {
  // ===================================================
  // /help
  // ===================================================

  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === "help") {
      if (
        !interaction.guild ||
        !interaction.memberPermissions?.has(
          PermissionsBitField.Flags.Administrator,
        )
      ) {
        return interaction.reply({
          content: "❌ You need **Administrator** permission to use `/help`.",
          ephemeral: true,
        });
      }

      try {
        await sendHelp(interaction, interaction.user);
      } catch (error) {
        console.error("❌ Error sending /help:", error);
      }
    }

    return;
  }

  // ===================================================
  // HELP PAGINATION BUTTONS
  // ===================================================

  if (!interaction.isButton()) return;

  if (
    !interaction.customId.startsWith("help_previous_") &&
    !interaction.customId.startsWith("help_next_")
  ) {
    return;
  }

  if (
    !interaction.guild ||
    !interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator)
  ) {
    return interaction.reply({
      content: "❌ You need **Administrator** permission to use this menu.",
      ephemeral: true,
    });
  }

  // Get original user who opened the help menu
  const originalUserId = interaction.message.interaction?.user?.id;

  // Prevent other users from controlling the menu
  if (originalUserId && interaction.user.id !== originalUserId) {
    return interaction.reply({
      content: "❌ You cannot control someone else's help menu.",
      ephemeral: true,
    });
  }

  let currentPage = parseInt(interaction.customId.split("_").pop());

  if (interaction.customId.startsWith("help_previous_")) {
    currentPage--;
  }

  if (interaction.customId.startsWith("help_next_")) {
    currentPage++;
  }

  // Keep page within valid range
  if (currentPage < 0) {
    currentPage = 0;
  }

  if (currentPage >= TOTAL_PAGES) {
    currentPage = TOTAL_PAGES - 1;
  }

  const embed = generateHelpEmbed(
    interaction.user,
    client.user.displayAvatarURL(),
    currentPage,
  );

  const buttons = generatePaginationButtons(currentPage);

  await interaction.update({
    embeds: [embed],
    components: [buttons],
  });
});

// =====================================================
// LOGIN
// =====================================================

client.login(BOT_TOKEN);
