require("dotenv").config();

const fs = require("fs");
const path = require("path");

const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  PermissionsBitField,
  Events,
  MessageFlags,
} = require("discord.js");

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

// ============================================================
// CONFIG
// ============================================================

const UPDATE_INTERVAL = 60 * 1000;

const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "guilds.json");

// ============================================================
// DATA DIRECTORY
// ============================================================

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, {
    recursive: true,
  });
}

if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify({}, null, 4));
}

// ============================================================
// DATABASE FUNCTIONS
// ============================================================

function loadDatabase() {
  try {
    const data = fs.readFileSync(DATA_FILE, "utf8");

    if (!data.trim()) {
      return {};
    }

    return JSON.parse(data);
  } catch (error) {
    console.error("Database read error:", error);
    return {};
  }
}

function saveDatabase(database) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(database, null, 4));
  } catch (error) {
    console.error("Database save error:", error);
  }
}

let database = loadDatabase();

// ============================================================
// UTILITY
// ============================================================

function escapeDiscord(text) {
  if (!text) return "Unknown";

  return String(text)
    .replace(/\\/g, "\\\\")
    .replace(/`/g, "\\`")
    .replace(/\*/g, "\\*")
    .replace(/_/g, "\\_")
    .replace(/~/g, "\\~");
}

function formatUptime(startTime) {
  if (!startTime) {
    return "Unknown";
  }

  const diff = Date.now() - startTime;

  if (diff < 0) {
    return "Unknown";
  }

  const seconds = Math.floor(diff / 1000);

  const days = Math.floor(seconds / 86400);

  const hours = Math.floor((seconds % 86400) / 3600);

  const minutes = Math.floor((seconds % 3600) / 60);

  const secs = seconds % 60;

  const parts = [];

  if (days > 0) {
    parts.push(`${days}d`);
  }

  if (hours > 0) {
    parts.push(`${hours}h`);
  }

  if (minutes > 0) {
    parts.push(`${minutes}m`);
  }

  if (parts.length === 0) {
    parts.push(`${secs}s`);
  }

  return parts.join(" ");
}

function getDefaultLogo(config) {
  if (config.logo) {
    return config.logo;
  }

  // Java server icon
  if (config.edition === "java") {
    return `https://api.mcstatus.io/v2/icon/${encodeURIComponent(
      config.address,
    )}`;
  }

  return null;
}

// ============================================================
// MINECRAFT STATUS
// ============================================================

async function fetchMinecraftStatus(config) {
  const edition = config.edition;

  let endpoint;

  if (edition === "java") {
    endpoint = `https://api.mcstatus.io/v2/status/java/${encodeURIComponent(
      config.address,
    )}`;
  } else if (edition === "bedrock") {
    endpoint = `https://api.mcstatus.io/v2/status/bedrock/${encodeURIComponent(
      config.address,
    )}`;
  } else {
    throw new Error("Invalid Minecraft edition.");
  }

  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, 10000);

  try {
    const response = await fetch(endpoint, {
      method: "GET",
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text();

      throw new Error(`Minecraft API error: ${response.status} ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeout);

    throw error;
  }
}

// ============================================================
// CREATE EMBED
// ============================================================

function createStatusEmbed(config, status) {
  const isOnline = status?.online === true;

  const onlinePlayers = status?.players?.online ?? 0;

  const maxPlayers = status?.players?.max ?? 0;

  let version = "Unknown";

  if (config.edition === "java") {
    version =
      status?.version?.name_clean || status?.version?.name_raw || "Unknown";
  } else {
    version = status?.version?.name || "Unknown";
  }

  let motd = "Unknown";

  if (status?.motd?.clean) {
    motd = status.motd.clean.replace(/\n+/g, " ").trim();
  }

  if (motd.length > 300) {
    motd = motd.substring(0, 297) + "...";
  }

  let color;

  if (isOnline) {
    color = 0x22c55e;
  } else {
    color = 0xef4444;
  }

  const statusText = isOnline ? "🟢 Online" : "🔴 Offline";

  const playersText = isOnline ? `${onlinePlayers} / ${maxPlayers}` : "0 / 0";

  const editionText =
    config.edition === "java" ? "☕ Java Edition" : "🪨 Bedrock Edition";

  const embed = new EmbedBuilder()
    .setColor(color)

    .setTitle(config.name)

    .setDescription(
      `${editionText}\n\n` +
        `**STATUS**\n${statusText}\n\n` +
        `**PLAYERS**\n${playersText}`,
    )

    .addFields(
      {
        name: "🌐 SERVER ADDRESS",
        value: `\`${config.address}\``,
        inline: false,
      },
      {
        name: "📦 VERSION",
        value: `\`${escapeDiscord(version)}\``,
        inline: true,
      },
      {
        name: "⏱ UPTIME",
        value: isOnline
          ? `\`${formatUptime(config.onlineSince)}\``
          : "`Offline`",
        inline: true,
      },
      {
        name: "📝 MOTD",
        value: `\`${escapeDiscord(motd)}\``,
        inline: false,
      },
    )

    .setFooter({
      text: "Minecraft Status • Updated automatically",
    })

    .setTimestamp();

  const logo = getDefaultLogo(config);

  if (logo) {
    embed.setThumbnail(logo);
  }

  if (config.banner) {
    embed.setImage(config.banner);
  }

  return embed;
}

// ============================================================
// UPDATE SINGLE GUILD
// ============================================================

async function updateGuildStatus(guildId) {
  const config = database[guildId];

  if (!config) {
    return;
  }

  try {
    const guild = await client.guilds.fetch(guildId);

    if (!guild) {
      return;
    }

    const channel = await guild.channels.fetch(config.channelId);

    if (!channel || !channel.isTextBased()) {
      console.log(`Invalid channel for guild ${guildId}`);

      return;
    }

    let status;

    try {
      status = await fetchMinecraftStatus(config);
    } catch (error) {
      console.error(`Minecraft check failed for ${guild.name}:`, error.message);

      status = {
        online: false,
      };
    }

    const isOnline = status.online === true;

    // ----------------------------------------------------
    // UPTIME TRACKING
    // ----------------------------------------------------

    if (isOnline) {
      if (!config.onlineSince) {
        config.onlineSince = Date.now();

        saveDatabase(database);
      }
    } else {
      config.onlineSince = null;

      saveDatabase(database);
    }

    const embed = createStatusEmbed(config, status);

    // ----------------------------------------------------
    // UPDATE EXISTING MESSAGE
    // ----------------------------------------------------

    if (config.messageId) {
      try {
        const message = await channel.messages.fetch(config.messageId);

        await message.edit({
          embeds: [embed],
        });

        return;
      } catch (error) {
        console.log(
          `Status message missing in ${guild.name}. Creating a new one.`,
        );

        config.messageId = null;
      }
    }

    // ----------------------------------------------------
    // CREATE NEW MESSAGE
    // ----------------------------------------------------

    const message = await channel.send({
      embeds: [embed],
    });

    config.messageId = message.id;

    saveDatabase(database);

    console.log(`Created status message for ${guild.name}`);
  } catch (error) {
    console.error(`Guild update error (${guildId}):`, error);
  }
}

// ============================================================
// UPDATE ALL GUILDS
// ============================================================

async function updateAllGuilds() {
  const guildIds = Object.keys(database);

  if (guildIds.length === 0) {
    return;
  }

  console.log(`Updating ${guildIds.length} Minecraft server(s)...`);

  for (const guildId of guildIds) {
    await updateGuildStatus(guildId);

    // Small delay so a large public bot doesn't hammer
    // the status API when it has many guilds.
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
}

// ============================================================
// SLASH COMMANDS
// ============================================================

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) {
    return;
  }

  if (interaction.commandName !== "mcstatus") {
    return;
  }

  // Prevent an interaction from being acknowledged twice
  if (interaction.replied || interaction.deferred) {
    console.log(`Ignoring already acknowledged interaction: ${interaction.id}`);
    return;
  }

  // Check Administrator permission
  if (
    !interaction.guild ||
    !interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator)
  ) {
    await interaction.reply({
      content: "❌ You need **Administrator** permission to use `/mcstatus`.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const subcommand = interaction.options.getSubcommand();

  // ====================================================
  // SETUP
  // ====================================================

  if (subcommand === "setup") {
    await interaction.deferReply({
        flags: MessageFlags.Ephemeral,
    });

    const guildId = interaction.guildId;

    if (!guildId) {
      await interaction.editReply(
        "❌ This command can only be used inside a Discord server.",
      );

      return;
    }

    const edition = interaction.options.getString("edition", true);

    const address = interaction.options.getString("address", true);

    const name = interaction.options.getString("name", true);

    const channel = interaction.options.getChannel("channel", true);

    const logo = interaction.options.getString("logo", false);

    if (!channel.isTextBased()) {
      await interaction.editReply("❌ Please select a text channel.");

      return;
    }

    // Check permissions
    const permissions = channel.permissionsFor(interaction.guild.members.me);

    if (
      !permissions ||
      !permissions.has(PermissionsBitField.Flags.SendMessages) ||
      !permissions.has(PermissionsBitField.Flags.EmbedLinks)
    ) {
      await interaction.editReply(
        "❌ I need **Send Messages** and **Embed Links** permissions in that channel.",
      );

      return;
    }

    database[guildId] = {
      name,

      edition,

      address,

      channelId: channel.id,

      messageId: null,

      logo: logo || null,

      banner: null,

      onlineSince: null,

      createdAt: Date.now(),
    };

    saveDatabase(database);

    await updateGuildStatus(guildId);

    await interaction.editReply(
      `✅ Minecraft status panel configured!\n\n` +
        `**Server:** ${name}\n` +
        `**Edition:** ${edition}\n` +
        `**Address:** \`${address}\`\n` +
        `**Channel:** ${channel}`,
    );

    return;
  }

  // ====================================================
  // STATUS
  // ====================================================

  if (subcommand === "status") {
    await interaction.deferReply({
      ephemeral: false,
    });

    const guildId = interaction.guildId;

    const config = database[guildId];

    if (!config) {
      await interaction.editReply(
        "❌ No Minecraft server has been configured.\n\nUse `/mcstatus setup` first.",
      );

      return;
    }

    try {
      const status = await fetchMinecraftStatus(config);

      const embed = createStatusEmbed(config, status);

      await interaction.editReply({
        embeds: [embed],
      });
    } catch (error) {
      await interaction.editReply(
        `❌ Could not check the Minecraft server.\n\n\`${error.message}\``,
      );
    }

    return;
  }

  // ====================================================
  // UPDATE
  // ====================================================

  if (subcommand === "update") {
    await interaction.deferReply({
      ephemeral: true,
    });

    const guildId = interaction.guildId;

    if (!database[guildId]) {
      await interaction.editReply("❌ No server is configured.");

      return;
    }

    await updateGuildStatus(guildId);

    await interaction.editReply("✅ Minecraft status panel updated.");

    return;
  }

  // ====================================================
  // CONFIG
  // ====================================================

  if (subcommand === "config") {
    const guildId = interaction.guildId;

    const config = database[guildId];

    if (!config) {
      await interaction.reply({
        content: "❌ No Minecraft server configured.",
        ephemeral: true,
      });

      return;
    }

    await interaction.reply({
      content:
        `**Minecraft Status Configuration**\n\n` +
        `**Name:** ${config.name}\n` +
        `**Edition:** ${config.edition}\n` +
        `**Address:** \`${config.address}\`\n` +
        `**Channel:** <#${config.channelId}>\n` +
        `**Status Message:** ${config.messageId ? "Configured" : "Not created"}`,

      ephemeral: true,
    });

    return;
  }

  // ====================================================
  // DISABLE
  // ====================================================

  if (subcommand === "disable") {
    const guildId = interaction.guildId;

    if (!database[guildId]) {
      await interaction.reply({
        content: "❌ No Minecraft status panel is configured.",
        ephemeral: true,
      });

      return;
    }

    delete database[guildId];

    saveDatabase(database);

    await interaction.reply({
      content:
        "✅ Minecraft status monitoring has been disabled for this server.",
      ephemeral: true,
    });

    return;
  }
});

// ============================================================
// BOT READY
// ============================================================

client.once(Events.ClientReady, async (ready) => {
  console.log(`====================================`);

  console.log(`Logged in as ${ready.user.tag}`);

  console.log(`Guilds: ${ready.guilds.cache.size}`);

  console.log(`Minecraft Status Bot is online`);

  console.log(`====================================`);

  // Initial update

  await updateAllGuilds();

  // Automatic updates

  setInterval(async () => {
    await updateAllGuilds();
  }, UPDATE_INTERVAL);
});

// ============================================================
// ERROR HANDLING
// ============================================================

process.on("unhandledRejection", (error) => {
  console.error("Unhandled promise rejection:", error);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
});

// ============================================================
// LOGIN
// ============================================================

client.login(process.env.DISCORD_TOKEN1);
