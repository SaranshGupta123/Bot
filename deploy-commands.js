require("dotenv").config();

const {
  REST,
  Routes,
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
} = require("discord.js");

const commands = [
  new SlashCommandBuilder()
    .setName("mcstatus")
    .setDescription("Minecraft server status commands")

    .addSubcommand((sub) =>
      sub
        .setName("setup")
        .setDescription("Setup a Minecraft server status panel")

        .addStringOption((option) =>
          option
            .setName("edition")
            .setDescription("Minecraft edition")
            .setRequired(true)
            .addChoices(
              {
                name: "Java Edition",
                value: "java",
              },
              {
                name: "Bedrock Edition",
                value: "bedrock",
              },
            ),
        )

        .addStringOption((option) =>
          option
            .setName("address")
            .setDescription("Minecraft server address")
            .setRequired(true),
        )

        .addStringOption((option) =>
          option
            .setName("name")
            .setDescription("Name displayed on the status panel")
            .setRequired(true),
        )

        .addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription("Channel where the status panel will be posted")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true),
        )

        .addStringOption((option) =>
          option
            .setName("logo")
            .setDescription("Optional server logo URL")
            .setRequired(false),
        ),
    )

    .addSubcommand((sub) =>
      sub
        .setName("status")
        .setDescription("Check the configured Minecraft server"),
    )

    .addSubcommand((sub) =>
      sub
        .setName("update")
        .setDescription("Force update the Minecraft status panel"),
    )

    .addSubcommand((sub) =>
      sub
        .setName("config")
        .setDescription("Show Minecraft status configuration"),
    )

    .addSubcommand((sub) =>
      sub
        .setName("disable")
        .setDescription("Disable the Minecraft status panel"),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)

    .toJSON(),
];

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN1);

(async () => {
  try {
    console.log("Registering global slash commands...");

    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), {
      body: commands,
    });

    console.log("Successfully registered global commands.");
  } catch (error) {
    console.error(error);
  }
})();
