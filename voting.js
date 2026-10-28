require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  SlashCommandBuilder,
  REST,
  Routes,
  Partials,
  AttachmentBuilder,
} = require("discord.js");

// ===============================
// CLIENT
// ===============================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

// ===============================
// SLASH COMMAND
// ===============================

const pollCommand = new SlashCommandBuilder()
  .setName("poll")
  .setDescription("Create a beautiful embedded poll")

  .addStringOption((option) =>
    option
      .setName("question")
      .setDescription("The question for the poll")
      .setRequired(true),
  )

  .addStringOption((option) =>
    option.setName("option1").setDescription("First option").setRequired(true),
  )

  .addStringOption((option) =>
    option.setName("option2").setDescription("Second option").setRequired(true),
  )

  .addStringOption((option) =>
    option
      .setName("option3")
      .setDescription("Third option (optional)")
      .setRequired(false),
  )

  .addStringOption((option) =>
    option
      .setName("option4")
      .setDescription("Fourth option (optional)")
      .setRequired(false),
  );

// ===============================
// DISCORD REST API
// ===============================

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN1);

// ===============================
// REGISTER COMMAND
// ===============================

async function registerCommands() {
  try {
    console.log("🔄 Registering slash commands...");

    await rest.put(
      Routes.applicationGuildCommands(
        process.env.CLIENT_ID,
        "1527635730044813462",
      ),
      {
        body: [pollCommand.toJSON()],
      },
    );

    console.log("✅ Slash commands registered successfully!");
  } catch (error) {
    console.error("❌ Error registering commands:", error);
  }
}

// ===============================
// BOT READY
// ===============================

client.once("clientReady", () => {
  console.log(`🤖 Logged in as ${client.user.tag}!`);

  registerCommands();
});

// ===============================
// INTERACTION HANDLER
// ===============================

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  // ===============================
  // /poll
  // ===============================

  if (interaction.commandName === "poll") {
    try {
      await interaction.deferReply();

      // Get question
      const question = interaction.options.getString("question");

      // Get options
      const options = [
        interaction.options.getString("option1"),
        interaction.options.getString("option2"),
        interaction.options.getString("option3"),
        interaction.options.getString("option4"),
      ].filter(Boolean);

      // ===============================
      // EMOJIS
      // ===============================

      const emojis = ["1️⃣", "2️⃣", "3️⃣", "4️⃣"];

      // ===============================
      // POLL DESCRIPTION
      // ===============================

      let description = "*Select an option below to cast your vote!*\n\n";

      for (let i = 0; i < options.length; i++) {
        description += `> ${emojis[i]} \` ${options[i]} \`\n` + `> \n`;
      }

      // ===============================
      // GIF ATTACHMENT
      // ===============================

      const pollGif = new AttachmentBuilder("./images/poll.gif", {
        name: "poll.gif",
      });

      // ===============================
      // CREATE EMBED
      // ===============================

      const pollEmbed = new EmbedBuilder()
        .setColor("#FF0055")

        .setAuthor({
          name: "S E R V E R  P O L L",
          iconURL:
            interaction.guild.iconURL({
              dynamic: true,
            }) || undefined,
        })

        .setTitle(question)

        .setDescription(description)

        .setThumbnail(
          "https://cdn3.iconfinder.com/data/icons/business-and-finance-113/32/survey-poll-vote-512.png",
        )

        // IMPORTANT:
        // This references the uploaded GIF
        .setImage("attachment://poll.gif")

        .setFooter({
          text: `Poll initiated by @${interaction.user.username}`,
          iconURL: interaction.user.displayAvatarURL({
            dynamic: true,
          }),
        })

        .setTimestamp();

      // ===============================
      // SEND POLL
      // ===============================

      const pollMessage = await interaction.editReply({
        embeds: [pollEmbed],

        // Upload GIF to Discord
        files: [pollGif],
      });

      // ===============================
      // ADD REACTIONS
      // ===============================

      for (let i = 0; i < options.length; i++) {
        await pollMessage.react(emojis[i]);
      }

      console.log("✅ Poll created successfully!");
    } catch (error) {
      console.error("❌ Poll error:", error);

      if (interaction.deferred) {
        await interaction.editReply({
          content: "❌ Something went wrong while creating the poll.",
        });
      }
    }
  }
});

// ===============================
// LOGIN
// ===============================

client.login(process.env.DISCORD_TOKEN1);
