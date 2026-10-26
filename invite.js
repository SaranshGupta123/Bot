require("dotenv").config();

const {
    Client,
    GatewayIntentBits,
    PermissionsBitField,
    EmbedBuilder,
    Collection
} = require("discord.js");

const Database = require("better-sqlite3");

// ==========================================
// CLIENT
// ==========================================

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildInvites
    ]
});

// ==========================================
// DATABASE
// ==========================================

const db = new Database("invites.sqlite");

db.pragma("journal_mode = WAL");

db.exec(`
    CREATE TABLE IF NOT EXISTS server_invites (
        guild_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        invites INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (guild_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS global_invites (
        user_id TEXT PRIMARY KEY,
        invites INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS invited_users (
        guild_id TEXT NOT NULL,
        invited_user_id TEXT NOT NULL,
        inviter_id TEXT NOT NULL,
        PRIMARY KEY (guild_id, invited_user_id)
    );
`);

// ==========================================
// INVITE CACHE
// ==========================================

// guildId -> Collection(inviteCode, uses)
const inviteCache = new Map();

// ==========================================
// DATABASE FUNCTIONS
// ==========================================

function getServerInvites(guildId, userId) {
    const row = db
        .prepare(`
            SELECT invites
            FROM server_invites
            WHERE guild_id = ? AND user_id = ?
        `)
        .get(guildId, userId);

    return row ? row.invites : 0;
}

function getGlobalInvites(userId) {
    const row = db
        .prepare(`
            SELECT invites
            FROM global_invites
            WHERE user_id = ?
        `)
        .get(userId);

    return row ? row.invites : 0;
}

function addInvite(guildId, userId) {

    db.prepare(`
        INSERT INTO server_invites (guild_id, user_id, invites)
        VALUES (?, ?, 1)
        ON CONFLICT(guild_id, user_id)
        DO UPDATE SET invites = invites + 1
    `).run(guildId, userId);

    db.prepare(`
        INSERT INTO global_invites (user_id, invites)
        VALUES (?, 1)
        ON CONFLICT(user_id)
        DO UPDATE SET invites = invites + 1
    `).run(userId);
}

function resetServerInvites(guildId, userId) {

    db.prepare(`
        INSERT INTO server_invites (guild_id, user_id, invites)
        VALUES (?, ?, 0)
        ON CONFLICT(guild_id, user_id)
        DO UPDATE SET invites = 0
    `).run(guildId, userId);
}

function getAllServerInvites(guildId) {

    return db.prepare(`
        SELECT user_id, invites
        FROM server_invites
        WHERE guild_id = ?
        ORDER BY invites DESC
    `).all(guildId);
}

// ==========================================
// FETCH INVITES
// ==========================================

async function cacheGuildInvites(guild) {

    try {

        const invites = await guild.invites.fetch();

        const collection = new Collection();

        invites.forEach(invite => {
            collection.set(invite.code, invite.uses || 0);
        });

        inviteCache.set(guild.id, collection);

        console.log(
            `📨 Cached ${collection.size} invites for ${guild.name}`
        );

    } catch (error) {

        console.error(
            `❌ Could not fetch invites for ${guild.name}:`,
            error.message
        );
    }
}

// ==========================================
// READY
// ==========================================

client.once("clientReady", async () => {

    console.log("=================================");
    console.log(`🤖 Logged in as ${client.user.tag}`);
    console.log(`🌐 Servers: ${client.guilds.cache.size}`);
    console.log("=================================");

    for (const guild of client.guilds.cache.values()) {
        await cacheGuildInvites(guild);
    }

    // ======================================
    // SLASH COMMANDS
    // ======================================

   const commands = [
     {
       name: "invites",
       description: "Check invite statistics",

       options: [
         // /invites user
         {
           name: "user",
           description: "Check a user's invite statistics",
           type: 1,

           options: [
             {
               name: "member",
               description: "User to check",
               type: 6,
               required: false,
             },
           ],
         },

         // /invites all
         {
           name: "all",
           description: "Show invite statistics for everyone",
           type: 1,
         },

         // /invites reset
         {
           name: "reset",
           description: "Reset a user's invites in this server",
           type: 1,

           options: [
             {
               name: "member",
               description: "User whose server invites should be reset",
               type: 6,
               required: true,
             },
           ],
         },
       ],
     },
   ];

    await client.application.commands.set(commands);

    console.log("✅ Slash commands registered");
});

// ==========================================
// NEW SERVER
// ==========================================

client.on("guildCreate", async guild => {

    console.log(`➕ Joined ${guild.name}`);

    await cacheGuildInvites(guild);
});

// ==========================================
// INVITE CREATED
// ==========================================

client.on("inviteCreate", invite => {

    const guild = invite.guild;

    if (!guild) return;

    if (!inviteCache.has(guild.id)) {
        inviteCache.set(guild.id, new Collection());
    }

    inviteCache.get(guild.id).set(
        invite.code,
        invite.uses || 0
    );

    console.log(
        `🔗 Invite created: ${invite.code} in ${guild.name}`
    );
});

// ==========================================
// INVITE DELETED
// ==========================================

client.on("inviteDelete", invite => {

    const guild = invite.guild;

    if (!guild) return;

    const cache = inviteCache.get(guild.id);

    if (cache) {
        cache.delete(invite.code);
    }
});

// ==========================================
// MEMBER JOIN
// ==========================================

client.on("guildMemberAdd", async member => {

    const guild = member.guild;

    try {

        const oldInvites = inviteCache.get(guild.id);

        const newInvites = await guild.invites.fetch();

        let usedInvite = null;

        // ==================================
        // Find invite whose usage increased
        // ==================================

        for (const invite of newInvites.values()) {

            const oldUses = oldInvites?.get(invite.code) || 0;
            const newUses = invite.uses || 0;

            if (newUses > oldUses) {
                usedInvite = invite;
                break;
            }
        }

        // ==================================
        // Update cache
        // ==================================

        const newCache = new Collection();

        newInvites.forEach(invite => {
            newCache.set(
                invite.code,
                invite.uses || 0
            );
        });

        inviteCache.set(guild.id, newCache);

        // ==================================
        // Could not determine inviter
        // ==================================

        if (!usedInvite) {

            console.log(
                `❓ Could not determine inviter for ${member.user.tag} in ${guild.name}`
            );

            return;
        }

        // ==================================
        // Vanity invite
        // ==================================

        if (!usedInvite.inviter) {

            console.log(
                `🌐 ${member.user.tag} joined using vanity/unknown invite`
            );

            return;
        }

        const inviterId = usedInvite.inviter.id;

        // ==================================
        // Prevent duplicate attribution
        // ==================================

        const alreadyTracked = db.prepare(`
            SELECT 1
            FROM invited_users
            WHERE guild_id = ?
            AND invited_user_id = ?
        `).get(guild.id, member.id);

        if (alreadyTracked) {

            console.log(
                `⚠️ ${member.user.tag} was already tracked`
            );

            return;
        }

        // ==================================
        // Save invited user
        // ==================================

        db.prepare(`
            INSERT INTO invited_users
            (guild_id, invited_user_id, inviter_id)
            VALUES (?, ?, ?)
        `).run(
            guild.id,
            member.id,
            inviterId
        );

        // ==================================
        // Add statistics
        // ==================================

        addInvite(guild.id, inviterId);

        console.log(
            `📈 ${usedInvite.inviter.tag} invited ${member.user.tag}`
        );

    } catch (error) {

        console.error(
            "❌ Invite tracking error:",
            error
        );
    }
});

// ==========================================
// SLASH COMMANDS
// ==========================================

client.on("interactionCreate", async interaction => {

    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName !== "invites") return;

    const guild = interaction.guild;

    if (!guild) {

        return interaction.reply({
            content: "❌ This command can only be used inside a server.",
            ephemeral: true
        });
    }

    // ======================================
    // /invites reset
    // ======================================

    const resetSubcommand =
        interaction.options.getSubcommand(false);

    if (resetSubcommand === "reset") {

        if (
            !interaction.member.permissions.has(
                PermissionsBitField.Flags.ManageGuild
            )
        ) {

            return interaction.reply({
                content:
                    "❌ You need **Manage Server** permission to reset invites.",
                ephemeral: true
            });
        }

        const user =
            interaction.options.getUser("user");

        resetServerInvites(
            guild.id,
            user.id
        );

        return interaction.reply({
            content:
                `✅ Reset **${user.tag}**'s invite count in **${guild.name}**.`
        });
    }

    // ======================================
    // /invites all
    // ======================================

    const showAll =
        interaction.options.getBoolean("all");

    if (showAll) {

        const results =
            getAllServerInvites(guild.id);

        if (!results.length) {

            return interaction.reply({
                content:
                    "📊 No invite statistics have been recorded yet."
            });
        }

        // Limit to avoid Discord's message/embed limits
        const top = results.slice(0, 25);

        let description = "";

        for (let i = 0; i < top.length; i++) {

            const row = top[i];

            let user;

            try {
                user = await client.users.fetch(row.user_id);
            } catch {
                user = null;
            }

            const username =
                user ? user.tag : `<@${row.user_id}>`;

            description +=
                `**${i + 1}.** ${username} • **${row.invites}** invites\n`;
        }

        const embed = new EmbedBuilder()
            .setTitle(`📊 Invite Leaderboard`)
            .setDescription(description)
            .setColor(0x5865F2)
            .setFooter({
                text: `${guild.name} • Top ${top.length}`
            })
            .setTimestamp();

        return interaction.reply({
            embeds: [embed]
        });
    }

    // ======================================
    // /invites @user
    // ======================================

    let user =
        interaction.options.getUser("user");

    if (!user) {
        user = interaction.user;
    }

    const serverCount =
        getServerInvites(
            guild.id,
            user.id
        );

    const globalCount =
        getGlobalInvites(user.id);

    const embed = new EmbedBuilder()
        .setTitle(`📨 Invite Statistics`)
        .setThumbnail(
            user.displayAvatarURL({
                size: 256
            })
        )
        .addFields(
            {
                name: "👤 User",
                value: `${user}`,
                inline: false
            },
            {
                name: "🏠 This Server",
                value: `**${serverCount}** people`,
                inline: true
            },
            {
                name: "🌎 Global Lifetime",
                value: `**${globalCount}** people`,
                inline: true
            }
        )
        .setColor(0x5865F2)
        .setFooter({
            text: guild.name
        })
        .setTimestamp();

    return interaction.reply({
        embeds: [embed]
    });
});

// ==========================================
// LOGIN
// ==========================================

client.login(process.env.DISCORD_TOKEN);