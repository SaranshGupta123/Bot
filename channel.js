require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  Partials,
  ChannelType,
  PermissionsBitField,
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});

client.once("clientReady", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  console.log(`📡 Connected to ${client.guilds.cache.size} server(s)`);
});

client.on("messageCreate", async (message) => {
  // Ignore bots
  if (message.author.bot) return;

  // Only work inside servers
  if (!message.guild) return;

  // Command must start with !find
  if (!message.content.toLowerCase().startsWith("!find")) return;

  // Get everything after !find
  const input = message.content.slice(5).trim();

  if (!input) {
    return message.reply(
      "❌ Please specify a channel.\nExample: `!find #general`"
    );
  }

  /*
   * Remove ONLY the first #.
   *
   * This allows names such as:
   * #general
   * #𝒢𝑒𝓃𝑒𝓇𝒶𝓁
   * #𝕘𝕖𝕟𝕖𝕣𝕒𝕝
   * #𝐆𝐞𝐧𝐞𝐫𝐚𝐥
   * #🔥・chat
   * #𝓒𝓱𝓪𝓽-𝟙
   */
  const channelName = input.startsWith("#")
    ? input.slice(1)
    : input;

  if (!channelName) {
    return message.reply("❌ Please provide a valid channel name.");
  }

  /*
   * Fetch all channels from the guild.
   *
   * fetch() is used instead of relying only on cache,
   * making the command more reliable for larger servers.
   */
  let channels;

  try {
    channels = await message.guild.channels.fetch();
  } catch (error) {
    console.error("Channel fetch error:", error);

    return message.reply(
      "❌ I couldn't fetch the channels in this server."
    );
  }

  /*
   * Find channels using Unicode-aware comparison.
   *
   * normalize("NFKC") converts many compatibility Unicode
   * representations into a comparable form.
   *
   * Example:
   * Full-width / mathematical-style Unicode can sometimes
   * normalize closer to their normal representation.
   */
  const normalizeName = (name) => {
    return name
      .normalize("NFKC")
      .trim()
      .toLocaleLowerCase();
  };

  const requestedName = normalizeName(channelName);

  /*
   * Search for an exact channel-name match.
   */
  const exactMatches = channels.filter((channel) => {
    if (!channel) return false;

    // Only text-based channels
    const validTypes = [
      ChannelType.GuildText,
      ChannelType.GuildAnnouncement,
      ChannelType.GuildForum,
      ChannelType.GuildMedia,
      ChannelType.GuildVoice,
      ChannelType.GuildStageVoice,
    ];

    if (!validTypes.includes(channel.type)) return false;

    return normalizeName(channel.name) === requestedName;
  });

  /*
   * If an exact match exists, show it.
   */
  if (exactMatches.size > 0) {
    const channel = exactMatches.first();

    return message.reply({
      content:
        `🔎 **Channel Found!**\n\n` +
        `📌 **Name:** ${channel.name}\n` +
        `🆔 **ID:** \`${channel.id}\`\n` +
        `📂 **Type:** ${getChannelType(channel.type)}\n` +
        `🔗 **Mention:** ${channel.toString()}`,
    });
  }

  /*
   * If no exact match exists, try a partial search.
   *
   * This means:
   * !find general
   *
   * can find:
   * #general-chat
   * #general
   * #general-discussion
   */
  const partialMatches = channels.filter((channel) => {
    if (!channel || !channel.name) return false;

    return normalizeName(channel.name).includes(requestedName);
  });

  if (partialMatches.size > 0) {
    const results = [...partialMatches.values()]
      .slice(0, 10)
      .map(
        (channel, index) =>
          `${index + 1}. ${channel.toString()} • \`${channel.name}\``
      )
      .join("\n");

    return message.reply({
      content:
        `🔍 **No exact match found for:** \`${channelName}\`\n\n` +
        `Here are the closest matches:\n\n${results}`,
    });
  }

  /*
   * Nothing found.
   */
  return message.reply(
    `❌ I couldn't find a channel matching \`${channelName}\`.`
  );
});

/**
 * Convert Discord channel type into a readable name.
 */
function getChannelType(type) {
  switch (type) {
    case ChannelType.GuildText:
      return "Text";

    case ChannelType.GuildAnnouncement:
      return "Announcement";

    case ChannelType.GuildForum:
      return "Forum";

    case ChannelType.GuildMedia:
      return "Media";

    case ChannelType.GuildVoice:
      return "Voice";

    case ChannelType.GuildStageVoice:
      return "Stage";

    default:
      return "Unknown";
  }
}

client.login(process.env.DISCORD_TOKEN1);