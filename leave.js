require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  REST,
  Routes,
  ApplicationCommandOptionType,
  PermissionsBitField,
  MessageFlags,
  ChannelType,
} = require("discord.js");

const Database = require("better-sqlite3");

// =====================================================
// CONFIG
// =====================================================

const BOT_TOKEN = process.env.BOT_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

if (!BOT_TOKEN) {
  console.error("❌ BOT_TOKEN is missing from .env");
  process.exit(1);
}

if (!CLIENT_ID) {
  console.error("❌ CLIENT_ID is missing from .env");
  process.exit(1);
}

// =====================================================
// DATABASE
// =====================================================

const db = new Database("servers.sqlite");

db.prepare(
  `
  CREATE TABLE IF NOT EXISTS guild_settings (
    guild_id TEXT PRIMARY KEY,
    channel_id TEXT
  )
`,
).run();

console.log("✅ Database initialized");

// =====================================================
// DISCORD CLIENT
// =====================================================

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

// =====================================================
// SLASH COMMANDS
// =====================================================

const commands = [
  {
    name: "setup-leaves",
    description: "Set the channel where leave messages will be sent.",
    default_member_permissions:
      PermissionsBitField.Flags.ManageGuild.toString(),

    options: [
      {
        name: "channel",
        description: "The channel to send leave logs in",
        type: ApplicationCommandOptionType.Channel,
        required: true,

        // Only allow text-based channels
        channel_types: [ChannelType.GuildText, ChannelType.GuildAnnouncement],
      },
    ],
  },
];

// =====================================================
// BOT READY
// =====================================================

client.once("clientReady", async () => {
  console.log(`✅ Bot online as ${client.user.tag}`);
  console.log(`🌐 Serving ${client.guilds.cache.size} server(s)`);

  const rest = new REST({ version: "10" }).setToken(BOT_TOKEN);

  try {
    console.log("🔄 Registering slash commands...");

    await rest.put(Routes.applicationCommands(CLIENT_ID), {
      body: commands,
    });

    console.log("✅ Successfully registered slash commands!");
  } catch (error) {
    console.error("❌ Failed to register slash commands:");
    console.error(error);
  }
});

// =====================================================
// SLASH COMMAND HANDLER
// =====================================================

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  // ---------------------------------------------------
  // /setup-leaves
  // ---------------------------------------------------

  if (interaction.commandName === "setup-leaves") {
    try {
      const selectedChannel = interaction.options.getChannel("channel");

      // Safety check
      if (!selectedChannel || !selectedChannel.isTextBased()) {
        return interaction.reply({
          content: "❌ Please select a valid text channel.",
          flags: MessageFlags.Ephemeral,
        });
      }

      // Save configuration
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO guild_settings
        (guild_id, channel_id)
        VALUES (?, ?)
      `);

      stmt.run(interaction.guildId, selectedChannel.id);

      await interaction.reply({
        content: `✅ Leave messages will now be sent in ${selectedChannel}.`,
        flags: MessageFlags.Ephemeral,
      });

      console.log(
        `⚙️ Leave channel configured for ${interaction.guild.name}: #${selectedChannel.name}`,
      );
    } catch (error) {
      console.error("❌ Error running /setup-leaves:", error);

      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: "❌ Something went wrong while saving the configuration.",
          flags: MessageFlags.Ephemeral,
        });
      }
    }
  }
});

// =====================================================
// MEMBER LEAVE EVENT
// =====================================================

client.on("guildMemberRemove", async (member) => {
  try {
    // Get configured channel for this server
    const row = db
      .prepare("SELECT channel_id FROM guild_settings WHERE guild_id = ?")
      .get(member.guild.id);

    // Server hasn't configured leave logs
    if (!row) {
      return;
    }

    // Get the configured channel
    const logChannel = member.guild.channels.cache.get(row.channel_id);

    // Channel was deleted or inaccessible
    if (!logChannel) {
      console.log(`⚠️ Leave channel no longer exists in ${member.guild.name}`);
      return;
    }

    // =================================================
    // CREATE LEAVE EMBED
    // =================================================

    const leaveEmbed = new EmbedBuilder()
      .setColor("#ff4747")
      .setTitle("👋 A Member Has Left")
      .setDescription(
        `**${member.user.tag}** has left **${member.guild.name}**.`,
      )
      .setThumbnail(
        member.user.displayAvatarURL({
          extension: "png",
          size: 256,
        }),
      )
      .addFields(
        {
          name: "👤 User",
          value: `${member.user}`,
          inline: true,
        },
        {
          name: "🆔 User ID",
          value: member.user.id,
          inline: true,
        },
        {
          name: "📅 Joined Server",
          value: member.joinedTimestamp
            ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>`
            : "Unknown",
          inline: false,
        },
        {
          name: "🌐 Server Website",
          value: "[Click here for our Website](https://battamizdill.com/)",
          inline: false,
        },
      )
      .setTimestamp()
      .setFooter({
        text: "Public User Leave Tracker",
        iconURL: member.guild.iconURL() || undefined,
      });

    // =================================================
    // SEND MESSAGE
    // =================================================

    await logChannel.send({
      embeds: [leaveEmbed],
    });

    console.log(`👋 ${member.user.tag} left ${member.guild.name}`);
  } catch (error) {
    console.error(
      `❌ Failed to process member leave in guild ${member.guild.id}:`,
      error,
    );
  }
});

// =====================================================
// LOGIN
// =====================================================

client.login(BOT_TOKEN);
