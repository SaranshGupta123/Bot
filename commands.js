require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField,
  Events,
} = require("discord.js");

const PREFIX = "%";
const BOT_TOKEN = process.env.DISCORD_TOKEN || process.env.DISCORD_TOKEN1;

if (!BOT_TOKEN) {
  console.error("❌ DISCORD_TOKEN (or DISCORD_TOKEN1) is missing from .env");
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// ============================================================
// FULL PROJECT COMMAND CATALOG
// ============================================================

const commandCategories = [
  {
    name: "📚 Commands & Help (Admin Only)",
    commands: [
      "`%commands` — Show this full command list across the entire project (`commands.js`)",
      "`%help` / `/help` — Open the paginated help dashboard (`help.js`, `help2.js`)",
    ],
  },
  {
    name: "🔨 Moderation (Admin Only)",
    commands: [
      "`%ban <userId>` — Ban a user by Discord User ID, even if not in server (`ban.js`)",
      "`%purge <1-99>` — Bulk delete 1–99 messages in the current channel (`purge.js`)",
    ],
  },
  {
    name: "🤖 AI Assistant & Memory (Admin Only)",
    commands: [
      "`%teach <fact>` — Teach the AI a fact to remember long-term (`ai.js`)",
      "`%learnweb <topic>` — Research a topic on the web and memorize facts (`ai.js`)",
      "`@Bot <message>` — Mention the AI bot to chat with memory + live web search (`ai.js`)",
    ],
  },
  {
    name: "🎉 Giveaways & Sticky Messages (Admin Only)",
    commands: [
      "`%giveaway <time> <prize>` — Start a reaction giveaway, e.g. `%giveaway 10m Nitro` (`giveaway.js`)",
      "`%stickstart <message>` — Pin a sticky message at the bottom of the channel (supports `\\n`) (`sticky.js`)",
      "`%stickstop` — Stop and remove the active sticky message in this channel (`sticky.js`)",
    ],
  },
  {
    name: "👋 Welcome, Pings & Leaves (Admin Only)",
    commands: [
      "`%welcome #channel` — Set the welcome embed channel (`welcome.js`)",
      "`%disablewelcome` — Disable welcome embeds (`welcome.js`)",
      "`%welcomestatus` — Check welcome embed status & channel (`welcome.js`)",
      "`%setwelcome #channel` — Set temporary welcome ping channel (auto-deletes after 20s) (`ping.js`)",
      "`%disableping` — Disable temporary welcome pings (`ping.js`)",
      "`/setup-leaves channel:#channel` — Set the member leave log channel (`leave.js`)",
    ],
  },
  {
    name: "🏷️ Server Tag Rewards (Admin Only • gifpic2.js)",
    commands: [
      "`%setup <roleId...> #channel` — Set tag reward role(s) and announcement channel",
      "`%addrole <roleId...>` / `%removerole <roleId...>` — Add or remove tag reward roles",
      "`%roles` — View configured tag reward roles",
      "`%setchannel #channel` / `%channel #channel` — Set announcement channel",
      "`%autoremove on|off` — Toggle removing roles when a member removes the tag",
      "`%status` — Show tag bot settings, holder count, and health",
      "`%list` — List current server tag holders",
      "`%history [1-25]` — Show recent tag adopt/remove events",
      "`%sync` — Re-check all members and sync tag roles",
      "`%setinviter <userId>` — Manually set who invited the bot",
    ],
  },
  {
    name: "📝 Rules & Quiz Role Panels (Admin Only Setup • Rolesgiving.js)",
    commands: [
      "`/panel create` / `delete` / `list` / `view` — Manage rules & quiz panels",
      "`/panel rule-add` / `rule-remove` — Add or remove panel rules",
      "`/panel question-add` / `question-remove` — Add or remove dropdown/text quiz questions",
      "`/panel pass` / `pass-clear` — Configure pass score & reward role (10m fail cooldown)",
      "`/panel cooldown-clear` — Clear a user's retest cooldown",
      "`/panel log` / `post` — Set submission log channel & post the panel embed",
    ],
  },
  {
    name: "📨 Invites & Channel Finder (Admin Only)",
    commands: [
      "`/invites user [member]` — Check server & global lifetime invites (`invite.js`)",
      "`/invites all` — Show server invite leaderboard (`invite.js`)",
      "`/invites reset member:@user` — Reset a user's server invites (`invite.js`)",
      "`%find <channel-name>` — Find a channel by exact or partial Unicode name (`channel.js`)",
    ],
  },
  {
    name: "⛏️ Minecraft Server Status (Admin Only • minecraft.js)",
    commands: [
      "`/mcstatus setup` — Configure a live Java/Bedrock server status panel",
      "`/mcstatus status` — Check current Minecraft server status",
      "`/mcstatus update` — Force refresh the Minecraft status panel",
      "`/mcstatus config` — View current Minecraft status configuration",
      "`/mcstatus disable` — Disable Minecraft status monitoring",
    ],
  },
  {
    name: "🌐 Public Commands (Not Admin Only)",
    commands: [
      "`%vanity` (or `vanity`) — Show the server's vanity URL (`vanity.js` • Everyone)",
      "`/poll question option1 option2 [option3] [option4]` — Create a reaction poll (`voting.js` • Everyone)",
      "`%lofi` / `%stop` — Start or stop 24/7 Lofi music in your VC (`musicBot.js` • Whitelist/Owners)",
      "`%grant @user` / `%revoke @user` — Grant or revoke MusicBot access (`musicBot.js` • Whitelist/Owners)",
    ],
  },
  {
    name: "🌧️ Rainfall Music (Not Admin Only • Rainfall Music/)",
    commands: [
      "**Playback:** `play`, `pause`, `resume`, `skip`, `previous`, `stop`, `queue`, `nowplaying`, `volume`, `seek`, `forward`, `rewind`, `shuffle`, `loop`, `autoplay`, `lyrics`, `remove`, `move`, `clear`, `replay`, `join`, `leave`, `jump`, `grab`, `247`",
      "**Filters:** `filter`, `bassboost`, `nightcore`",
      "**Playlists & User:** `playlist`, `favorites`, `history`, `profile`, `stats`",
      "**Config & Info:** `help`, `prefix`, `noprefix`, `settings`, `djrole`, `allowedchannels`, `defaultvolume`, `permissions`, `ping`, `invite`, `serverinfo`, `botinfo`, `maintenance`, `blacklist`",
    ],
  },
];

const CATEGORIES_PER_PAGE = 2;
const TOTAL_PAGES = Math.ceil(commandCategories.length / CATEGORIES_PER_PAGE);

function generateCommandsEmbed(user, botAvatarURL, page) {
  const startIndex = page * CATEGORIES_PER_PAGE;
  const pageCategories = commandCategories.slice(
    startIndex,
    startIndex + CATEGORIES_PER_PAGE,
  );

  const embed = new EmbedBuilder()
    .setColor("#5865F2")
    .setTitle("📜 Full Bot Commands Reference")
    .setDescription(
      `Prefix: \`${PREFIX}\` • Admin-only bots require Discord **Administrator** permission.\n` +
        `Public exceptions: **Rainfall Music**, **Vanity**, **Voting**, and **MusicBot**.\n\n` +
        `📄 **Page ${page + 1} of ${TOTAL_PAGES}**`,
    )
    .setThumbnail(botAvatarURL)
    .setFooter({
      text: `Requested by ${user.tag} • Page ${page + 1}/${TOTAL_PAGES}`,
      iconURL: user.displayAvatarURL({ dynamic: true }),
    })
    .setTimestamp();

  for (const category of pageCategories) {
    embed.addFields({
      name: category.name,
      value: category.commands.join("\n").slice(0, 1024),
      inline: false,
    });
  }

  return embed;
}

function generatePaginationButtons(userId, page) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`cmds_prev_${userId}_${page}`)
      .setLabel("Previous")
      .setEmoji("◀️")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page === 0),
    new ButtonBuilder()
      .setCustomId("cmds_page")
      .setLabel(`${page + 1} / ${TOTAL_PAGES}`)
      .setStyle(ButtonStyle.Primary)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId(`cmds_next_${userId}_${page}`)
      .setLabel("Next")
      .setEmoji("▶️")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page === TOTAL_PAGES - 1),
  );
}

// ============================================================
// EVENTS
// ============================================================

client.once(Events.ClientReady, () => {
  console.log(`✅ Commands bot logged in as ${client.user.tag}`);
  console.log(`📜 Use ${PREFIX}commands (Admins only) • ${TOTAL_PAGES} pages`);
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot || !message.guild) return;

  const content = message.content.trim().toLowerCase();
  if (content !== `${PREFIX}commands`) return;

  if (
    !message.member?.permissions.has(PermissionsBitField.Flags.Administrator)
  ) {
    return message.reply(
      `❌ You need **Administrator** permission to use \`${PREFIX}commands\`.`,
    );
  }

  try {
    const embed = generateCommandsEmbed(
      message.author,
      client.user.displayAvatarURL(),
      0,
    );
    const buttons = generatePaginationButtons(message.author.id, 0);

    await message.reply({
      embeds: [embed],
      components: [buttons],
    });
  } catch (error) {
    console.error("❌ Error sending %commands:", error);
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isButton()) return;

  const customId = interaction.customId;
  if (
    !customId.startsWith("cmds_prev_") &&
    !customId.startsWith("cmds_next_")
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

  const parts = customId.split("_");
  const direction = parts[1];
  const ownerId = parts[2];
  let page = parseInt(parts[3], 10);

  if (ownerId && interaction.user.id !== ownerId) {
    return interaction.reply({
      content: "❌ You cannot control someone else's commands menu.",
      ephemeral: true,
    });
  }

  if (direction === "prev") page -= 1;
  if (direction === "next") page += 1;

  if (Number.isNaN(page) || page < 0) page = 0;
  if (page >= TOTAL_PAGES) page = TOTAL_PAGES - 1;

  const embed = generateCommandsEmbed(
    interaction.user,
    client.user.displayAvatarURL(),
    page,
  );
  const buttons = generatePaginationButtons(ownerId, page);

  await interaction.update({
    embeds: [embed],
    components: [buttons],
  });
});

client.login(BOT_TOKEN);
