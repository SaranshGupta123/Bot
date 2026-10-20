"use strict";

/**
 * ═══════════════════════════════════════════════════════════════════
 *  RainFall • Server Tag Bot        (discord.js v14 — single file)
 * ═══════════════════════════════════════════════════════════════════
 *  • Member adopts the server tag  → gets your chosen role(s) + is pinged in your chosen channel
 *  • Member removes the tag        → pinged again (roles taken back — toggle with !autoremove)
 *  • Everything is stored in data.json: who invited the bot, who adopted / removed
 *    the tag (with time), plus your settings
 *  • On EVERY start / restart it re-checks all members, so nothing is missed while it was offline
 *
 *  Setup
 *    1. npm i discord.js@14
 *    2. Put your token in the DISCORD_TOKEN env var (or paste it below)
 *    3. Dev Portal → your app → Bot → turn ON: SERVER MEMBERS INTENT + MESSAGE CONTENT INTENT
 *    4. node index.js
 *    5. In your server (as admin):   !setup <roleId> <roleId> <roleId> #channel
 *       (role IDs: turn on Developer Mode → right-click a role → Copy Role ID)
 *
 *  Bot needs:  Manage Roles • View Channel • Send Messages • Embed Links • View Audit Log
 *  and its own role must sit ABOVE the roles it hands out.
 */

require("dotenv").config();

const fs = require("fs");
const path = require("path");

const {
  Client,
  GatewayIntentBits,
  Events,
  EmbedBuilder,
  PermissionFlagsBits,
  AuditLogEvent,
  escapeMarkdown,
} = require("discord.js");

const TOKEN = process.env.DISCORD_TOKEN?.trim().replace(/^["']|["']$/g, "");

const PREFIX = "!";
const DATA_FILE = path.join(__dirname, "data.json");
const SWEEP_EVERY_MINUTES = 5; // safety-net re-check of already-cached members (no extra API load). 0 = off
const MAX_HISTORY = 1000; // adopt/remove log entries kept per server in data.json

const COLOR = { adopt: 0x4fc3f7, remove: 0x90a4ae, info: 0x5c6bc0 };

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers, // privileged: member/user updates + full member list
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent, // privileged: "!" commands
  ],
  allowedMentions: { parse: [] }, // nothing pings unless we explicitly allow it
});

/* ═════════════════════════════ DATA (data.json) ═════════════════════════════ */

let data = loadData();
let saveTimer = null;

function loadData() {
  try {
    const parsed = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    if (!parsed || typeof parsed !== "object")
      throw new Error("not a JSON object");
    parsed.guilds ??= {};
    return parsed;
  } catch (err) {
    if (err.code !== "ENOENT") {
      console.error(
        `[data] data.json unreadable (${err.message}) — starting fresh, old file copied to data.json.bad`,
      );
      try {
        fs.copyFileSync(DATA_FILE, `${DATA_FILE}.bad`);
      } catch {}
    }
    return { guilds: {} };
  }
}

function saveNow() {
  clearTimeout(saveTimer);
  saveTimer = null;
  const json = JSON.stringify(data, null, 2);
  const tmp = `${DATA_FILE}.tmp`;
  try {
    fs.writeFileSync(tmp, json);
    fs.renameSync(tmp, DATA_FILE);
  } catch {
    try {
      fs.writeFileSync(DATA_FILE, json);
    } catch (err) {
      console.error("[data] could not save data.json:", err.message);
    }
  }
}

function saveSoon() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, 400);
}

/** One record per server. Shape:
 *  { name, botJoinedAt, invitedBy:{id,username,at,source}|null, initialized, lastSyncAt,
 *    config:{ roleIds:[], channelId, removeRolesOnRemove },
 *    members:{ [userId]:{ username, hasTag, tag, adoptedAt, removedAt } },
 *    history:[ { at, action:'adopted'|'removed', userId, username, tag, reason?, source } ] } */
function getGuildRec(guild) {
  const rec = (data.guilds[guild.id] ??= {});
  rec.name = guild.name;
  rec.botJoinedAt ??= null;
  rec.invitedBy ??= null;
  rec.initialized ??= false;
  rec.lastSyncAt ??= null;
  rec.config ??= {};
  rec.config.roleIds ??= [];
  rec.config.channelId ??= null;
  rec.config.removeRolesOnRemove ??= true;
  rec.members ??= {};
  rec.history ??= [];
  return rec;
}

/* ═════════════════════════════ HELPERS ═════════════════════════════ */

const iso = () => new Date().toISOString();
const unix = (s) => Math.floor(new Date(s).getTime() / 1000);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const holderCount = (rec) =>
  Object.values(rec.members).filter((m) => m.hasTag).length;
const isAdmin = (member) =>
  member.permissions.has(PermissionFlagsBits.ManageGuild);

/** True when the user is currently DISPLAYING this server's tag. */
function wearsTag(user, guildId) {
  const pg = user && user.primaryGuild;
  return Boolean(
    pg && pg.identityEnabled === true && pg.identityGuildId === guildId,
  );
}

function pushHistory(rec, entry) {
  rec.history.push(entry);
  if (rec.history.length > MAX_HISTORY)
    rec.history.splice(0, rec.history.length - MAX_HISTORY);
}

async function getMe(guild) {
  return guild.members.me ?? (await guild.members.fetchMe().catch(() => null));
}

function roleProblem(guild, role) {
  const me = guild.members.me;
  if (role.id === guild.id) return "@everyone can't be used";
  if (role.managed) return "it belongs to a bot/integration";
  if (me && !me.permissions.has(PermissionFlagsBits.ManageRoles))
    return "I need the **Manage Roles** permission";
  if (me && role.position >= me.roles.highest.position) {
    return "it is above my highest role (drag my role higher in Server Settings → Roles)";
  }
  return null;
}

function channelProblem(guild, channel) {
  if (!channel.isTextBased()) return "that is not a text channel";
  const me = guild.members.me;
  const perms = me && channel.permissionsFor(me);
  if (
    perms &&
    !perms.has([
      PermissionFlagsBits.ViewChannel,
      PermissionFlagsBits.SendMessages,
    ])
  ) {
    return "I can't view/send messages there — fix the channel permissions";
  }
  return null;
}

/** Shows a role as "Name (id)" — plain text, so the bot's replies never tag/ping a role. */
function roleLabel(guild, id) {
  const role = guild.roles.cache.get(id);
  return role
    ? `**${escapeMarkdown(role.name)}** (\`${id}\`)`
    : `\`${id}\` *(deleted role)*`;
}

const unknownNotes = (unknown) =>
  unknown.map(
    (t) =>
      `⚠️ \`${String(t).replace(/`/g, "'").slice(0, 40)}\` — not a role ID or channel in this server`,
  );

/**
 * Reads the command arguments in any order:
 *   roles   → role IDs (right-click role → Copy Role ID). @role mentions work too, but they ping the role.
 *   channel → #mention, channel ID, or a typed #name
 * Separate IDs with spaces or commas. Anything that isn't recognised comes back in `unknown`.
 */
function parseTargets(guild, args) {
  const roles = new Map();
  let channel = null;
  const unknown = [];
  for (const raw of args.flatMap((a) => a.split(",")).filter(Boolean)) {
    const id = raw.replace(/[<@&#>]/g, "");
    if (/^\d{15,25}$/.test(id)) {
      const role = guild.roles.cache.get(id);
      if (role) {
        roles.set(role.id, role);
        continue;
      }
      const ch = guild.channels.cache.get(id);
      if (ch) {
        channel ??= ch;
        continue;
      }
    } else if (raw.startsWith("#")) {
      const name = raw.slice(1).toLowerCase();
      const ch = guild.channels.cache.find(
        (c) => c.isTextBased() && c.name.toLowerCase() === name,
      );
      if (ch) {
        channel ??= ch;
        continue;
      }
    }
    unknown.push(raw);
  }
  return { roles: [...roles.values()], channel, unknown };
}

/* ═════════════════════════════ WHO INVITED THE BOT ═════════════════════════════ */

/** Discord only exposes this through the audit log ("Add Bot" entry), which needs View Audit Log
 *  and only keeps entries for a limited time. If it can't be found, use !setinviter. */
async function captureInviter(guild, rec) {
  const me = await getMe(guild);
  if (me && !rec.botJoinedAt)
    rec.botJoinedAt = me.joinedAt ? me.joinedAt.toISOString() : null;
  if (rec.invitedBy) return;

  if (!me || !me.permissions.has(PermissionFlagsBits.ViewAuditLog)) {
    rec.inviterNote = "I need the View Audit Log permission to look it up.";
    return;
  }
  try {
    const logs = await guild.fetchAuditLogs({
      type: AuditLogEvent.BotAdd,
      limit: 100,
    });
    const entry = logs.entries.find(
      (e) => (e.targetId ?? e.target?.id) === client.user.id,
    );
    if (!entry) {
      rec.inviterNote =
        'No "Add Bot" entry left in the audit log (old entries expire).';
      return;
    }
    const executor =
      entry.executor ??
      (await client.users.fetch(entry.executorId).catch(() => null));
    rec.invitedBy = {
      id: entry.executorId,
      username: executor ? executor.username : "unknown",
      at: new Date(entry.createdTimestamp).toISOString(),
      source: "audit-log",
    };
    delete rec.inviterNote;
  } catch (err) {
    rec.inviterNote = `Audit log lookup failed: ${err.message}`;
  }
}

/* ═════════════════════════════ ROLES ═════════════════════════════ */

/** Gives the member every configured role they don't have yet. */
async function giveRoles(guild, rec, member, reason) {
  const wanted = rec.config.roleIds.filter((id) => guild.roles.cache.has(id));
  const missing = wanted.filter((id) => !member.roles.cache.has(id));
  const failed = [];
  if (missing.length) {
    try {
      await member.roles.add(missing, reason);
    } catch {
      // one bad role (e.g. above the bot) shouldn't block the others
      for (const id of missing) {
        try {
          await member.roles.add(id, reason);
        } catch (err) {
          failed.push(id);
          console.warn(
            `[roles] could not give role ${id} to ${member.user.username}: ${err.message}`,
          );
        }
      }
    }
  }
  return {
    given: wanted.filter((id) => !failed.includes(id)), // roles the member has now
    added: missing.filter((id) => !failed.includes(id)), // roles newly added this time
    failed,
  };
}

/** Takes the configured roles back (only if !autoremove is on). */
async function takeRoles(guild, rec, member, reason) {
  if (!member || !rec.config.removeRolesOnRemove) return [];
  const toRemove = rec.config.roleIds.filter((id) =>
    member.roles.cache.has(id),
  );
  if (!toRemove.length) return [];
  try {
    await member.roles.remove(toRemove, reason);
    return toRemove;
  } catch {
    const removed = [];
    for (const id of toRemove) {
      try {
        await member.roles.remove(id, reason);
        removed.push(id);
      } catch (err) {
        console.warn(
          `[roles] could not remove role ${id} from ${member.user.username}: ${err.message}`,
        );
      }
    }
    return removed;
  }
}

/* ═════════════════════════════ ANNOUNCEMENTS ═════════════════════════════ */

async function announceChange(guild, rec, info) {
  if (!rec.config.channelId) return;

  const channel =
    guild.channels.cache.get(rec.config.channelId) ??
    (await guild.channels.fetch(rec.config.channelId).catch(() => null));
  if (!channel || !channel.isTextBased()) {
    console.warn(
      `[announce] ${guild.name}: announcement channel is gone — set a new one with ${PREFIX}setchannel`,
    );
    return;
  }
  const me = await getMe(guild);
  const perms = me && channel.permissionsFor(me);
  if (
    !perms ||
    !perms.has([
      PermissionFlagsBits.ViewChannel,
      PermissionFlagsBits.SendMessages,
    ])
  ) {
    console.warn(
      `[announce] ${guild.name}: I can't send messages in #${channel.name}`,
    );
    return;
  }

  const tagText = info.tag ? `**${info.tag}**` : "server";
  const who = info.left ? `**${info.username}**` : `<@${info.userId}>`;
  const roleText = info.roleIds.length
    ? info.roleIds.map((id) => `<@&${id}>`).join(" ")
    : null;
  const holders = holderCount(rec);

  const embed = new EmbedBuilder()
    .setFooter({
      text: `${guild.name} • ${holders} tag holder${holders === 1 ? "" : "s"}`,
    })
    .setTimestamp();

  if (info.kind === "adopted") {
    embed
      .setColor(COLOR.adopt)
      .setTitle("🌧️ A new raindrop joined the storm!")
      .setDescription(`${who} just adopted the ${tagText} tag!`);
    if (roleText) embed.addFields({ name: "Roles received", value: roleText });
  } else {
    embed
      .setColor(COLOR.remove)
      .setTitle("☁️ The clouds cleared…")
      .setDescription(
        info.left
          ? `${who} left the server, so the ${tagText} tag is gone.`
          : `${who} removed the ${tagText} tag.`,
      );
    if (roleText) embed.addFields({ name: "Roles removed", value: roleText });
  }
  if (info.avatarURL) embed.setThumbnail(info.avatarURL);

  const payload = {
    content: info.left ? undefined : `<@${info.userId}>`, // the actual ping (pings inside embeds don't notify)
    embeds: [embed],
    allowedMentions: { users: info.left ? [] : [info.userId] },
  };
  if (!perms.has(PermissionFlagsBits.EmbedLinks)) {
    payload.content = `${info.left ? "" : `<@${info.userId}> `}${embed.data.description}${roleText ? ` (${roleText})` : ""}`;
    delete payload.embeds;
  }
  await channel
    .send(payload)
    .catch((err) => console.warn(`[announce] send failed: ${err.message}`));
}

/* ═════════════════════════════ TAG CHANGES ═════════════════════════════ */

/** NOTE: state is updated synchronously BEFORE any await, so if Discord delivers the same
 *  change twice (userUpdate + sweep, etc.) the second call sees "no change" and does nothing. */
async function onAdopted(
  guild,
  rec,
  member,
  user,
  { announce = true, baseline = false, source = "live" } = {},
) {
  const tag = user.primaryGuild?.tag ?? null;
  const entry = (rec.members[member.id] ??= {});
  entry.username = user.username;
  entry.hasTag = true;
  entry.tag = tag;
  entry.adoptedAt = baseline ? null : iso(); // null = already had it when I first checked
  entry.removedAt = null;
  if (!baseline)
    pushHistory(rec, {
      at: entry.adoptedAt,
      action: "adopted",
      userId: member.id,
      username: user.username,
      tag,
      source,
    });
  saveSoon();
  console.log(
    `[tag] + ${user.username} ${baseline ? "already wears" : "adopted"} the tag (${source})`,
  );

  const { given } = await giveRoles(
    guild,
    rec,
    member,
    "Adopted the server tag",
  );
  if (announce) {
    await announceChange(guild, rec, {
      kind: "adopted",
      userId: member.id,
      username: user.username,
      tag,
      roleIds: given,
      avatarURL: member.displayAvatarURL({ size: 256 }),
    });
  }
}

async function onRemoved(
  guild,
  rec,
  userId,
  {
    member = null,
    user = null,
    left = false,
    announce = true,
    source = "live",
  } = {},
) {
  const entry = rec.members[userId];
  if (!entry || !entry.hasTag) return;
  const username = (user && user.username) || entry.username || userId;
  entry.hasTag = false;
  entry.removedAt = iso();
  entry.username = username;
  pushHistory(rec, {
    at: entry.removedAt,
    action: "removed",
    userId,
    username,
    tag: entry.tag ?? null,
    reason: left ? "left-server" : "tag-removed",
    source,
  });
  saveSoon();
  console.log(
    `[tag] - ${username} ${left ? "left the server" : "removed the tag"} (${source})`,
  );

  const roleIds = left
    ? []
    : await takeRoles(guild, rec, member, "Removed the server tag");
  if (announce) {
    await announceChange(guild, rec, {
      kind: "removed",
      userId,
      username,
      tag: entry.tag ?? null,
      roleIds,
      left,
      avatarURL: member ? member.displayAvatarURL({ size: 256 }) : null,
    });
  }
}

/** Real-time path: called for every member/user update Discord sends us. */
async function handleLive(guild, member, user, source = "live") {
  try {
    if (!member || !user || user.bot) return;
    const rec = getGuildRec(guild);
    if (!rec.initialized) return; // the startup check is still running; it will cover this member
    const now = wearsTag(user, guild.id);
    const prev = rec.members[member.id]?.hasTag === true;
    if (now && !prev) await onAdopted(guild, rec, member, user, { source });
    else if (!now && prev)
      await onRemoved(guild, rec, member.id, { member, user, source });
  } catch (err) {
    console.error("[live] handler error:", err);
  }
}

/* ═════════════════════════════ FULL CHECK (start / restart / !sync) ═════════════════════════════ */

const syncing = new Set();

/**
 * Compares every member's CURRENT tag state with what data.json remembers.
 *   fetch   – true: download the full member list first · false: use the cache only (sweeps)
 *   announce– ping/announce the differences found (never on a server's very first check)
 *   ensure  – also top up missing roles for people who already wear the tag
 */
async function syncGuild(
  guild,
  { fetch = true, announce = true, ensure = false, source = "sync" } = {},
) {
  if (syncing.has(guild.id)) return null;
  syncing.add(guild.id);
  try {
    const rec = getGuildRec(guild);
    let members;
    if (fetch) {
      try {
        members = await guild.members.fetch();
      } catch (err) {
        console.warn(
          `[sync] ${guild.name}: could not fetch members (${err.message}). Is the SERVER MEMBERS INTENT on?`,
        );
        return null;
      }
    } else {
      members = guild.members.cache;
    }

    const first = !rec.initialized; // first ever check = silent baseline, so existing tag holders aren't all pinged
    const doAnnounce = announce && !first;
    const doEnsure = ensure || first;
    const stats = {
      first,
      holders: 0,
      adopted: 0,
      removed: 0,
      left: 0,
      rolesFixed: 0,
    };

    for (const member of [...members.values()]) {
      if (member.user.bot) continue;
      let user = member.user;
      let now = wearsTag(user, guild.id);
      const prev = rec.members[member.id]?.hasTag === true;

      if (!now && prev) {
        // Double-check with a fresh lookup before treating it as a removal.
        const fresh = await client.users
          .fetch(member.id, { force: true })
          .catch(() => null);
        if (!fresh) {
          stats.holders++; // couldn't verify → keep them as they were
          continue;
        }
        user = fresh;
        now = wearsTag(fresh, guild.id);
      }

      if (now && !prev) {
        stats.adopted++;
        await onAdopted(guild, rec, member, user, {
          announce: doAnnounce,
          baseline: first,
          source,
        });
      } else if (!now && prev) {
        stats.removed++;
        await onRemoved(guild, rec, member.id, {
          member,
          user,
          announce: doAnnounce,
          source,
        });
      } else if (now && prev && doEnsure) {
        const { added } = await giveRoles(
          guild,
          rec,
          member,
          "Wears the server tag",
        );
        stats.rolesFixed += added.length;
      }
      if (now) stats.holders++;
    }

    // People we knew had the tag who are no longer in the server (left while the bot was offline).
    const listComplete =
      fetch && members.size >= Math.floor(guild.memberCount * 0.95);
    if (listComplete) {
      for (const [id, entry] of Object.entries(rec.members)) {
        if (entry.hasTag && !members.has(id)) {
          stats.left++;
          await onRemoved(guild, rec, id, {
            left: true,
            announce: doAnnounce,
            source,
          });
        }
      }
    }

    rec.initialized = true;
    rec.lastSyncAt = iso();
    saveSoon();
    return stats;
  } finally {
    syncing.delete(guild.id);
  }
}

async function bootGuild(guild, { fresh = false } = {}) {
  const rec = getGuildRec(guild);
  if (fresh) {
    // bot was (re)invited: forget the old inviter and re-baseline quietly
    rec.invitedBy = null;
    rec.botJoinedAt = null;
    rec.initialized = false;
    delete rec.inviterNote;
  }
  await captureInviter(guild, rec);
  saveSoon();

  const stats = await syncGuild(guild, {
    fetch: true,
    announce: true,
    source: fresh ? "join-sync" : "startup-sync",
  });
  if (!stats) return;
  if (stats.first) {
    console.log(
      `[startup] ${guild.name}: first run — saved ${stats.holders} current tag holder(s) as the baseline (nobody pinged)`,
    );
  } else {
    console.log(
      `[startup] ${guild.name}: ${stats.holders} tag holder(s) • ${stats.adopted} new • ${stats.removed + stats.left} removed since last run`,
    );
  }
}

async function sweep() {
  for (const guild of client.guilds.cache.values()) {
    const rec = data.guilds[guild.id];
    if (!rec || !rec.initialized) continue;
    await syncGuild(guild, {
      fetch: false,
      announce: true,
      source: "sweep",
    }).catch((err) => console.error("[sweep] error:", err));
  }
}

/* ═════════════════════════════ DISCORD EVENTS ═════════════════════════════ */

client.once(Events.ClientReady, async () => {
  console.log(
    `✅ Logged in as ${client.user.tag} — in ${client.guilds.cache.size} server(s)`,
  );
  if (client.user.primaryGuild === undefined) {
    console.warn(
      "⚠️  This discord.js version has no user.primaryGuild — tag detection will NOT work. Run: npm i discord.js@14",
    );
  }
  for (const guild of client.guilds.cache.values()) {
    try {
      await bootGuild(guild);
    } catch (err) {
      console.error(`[startup] ${guild.name}:`, err);
    }
  }
  console.log("✅ Startup check finished — now watching for tag changes.");
  if (SWEEP_EVERY_MINUTES > 0) setInterval(sweep, SWEEP_EVERY_MINUTES * 60_000);
});

// A server tag change arrives as a user update (Discord sends it inside GUILD_MEMBER_UPDATE).
client.on(Events.UserUpdate, (_old, user) => {
  for (const guild of client.guilds.cache.values()) {
    const member = guild.members.cache.get(user.id);
    if (member) handleLive(guild, member, user);
  }
});
client.on(Events.GuildMemberUpdate, (_old, member) =>
  handleLive(member.guild, member, member.user),
);
client.on(Events.GuildMemberAvailable, (member) =>
  handleLive(member.guild, member, member.user),
);
client.on(Events.GuildMemberAdd, (member) =>
  handleLive(member.guild, member, member.user),
);

client.on(Events.GuildMemberRemove, (member) => {
  const rec = data.guilds[member.guild.id];
  if (rec?.members[member.id]?.hasTag) {
    onRemoved(member.guild, rec, member.id, {
      user: member.user,
      left: true,
    }).catch((err) => console.error("[leave] error:", err));
  }
});

client.on(Events.GuildCreate, async (guild) => {
  await sleep(2500); // give Discord a moment to write the "Add Bot" audit-log entry
  try {
    await bootGuild(guild, { fresh: true });
  } catch (err) {
    console.error(`[join] ${guild.name}:`, err);
  }
});

/* ═════════════════════════════ COMMANDS ═════════════════════════════ */

const COMMANDS = new Set([
  "help",
  "setup",
  "roles",
  "addrole",
  "removerole",
  "setchannel",
  "channel",
  "autoremove",
  "status",
  "list",
  "history",
  "sync",
  "setinviter",
]);

client.on(Events.MessageCreate, async (message) => {
  try {
    if (
      message.author.bot ||
      !message.inGuild() ||
      !message.content.startsWith(PREFIX)
    )
      return;
    const [rawCmd, ...args] = message.content
      .slice(PREFIX.length)
      .trim()
      .split(/\s+/);
    const cmd = (rawCmd || "").toLowerCase();
    if (!COMMANDS.has(cmd)) return;
    const member =
      message.member ??
      (await message.guild.members.fetch(message.author.id).catch(() => null));
    if (!member || !isAdmin(member)) return; // admins (Manage Server) only — everyone else is ignored silently
    await runCommand(cmd, args, message);
  } catch (err) {
    console.error("[command] error:", err);
    message
      .reply({
        content: "❌ Something went wrong — check the bot console.",
        allowedMentions: { parse: [], repliedUser: false },
      })
      .catch(() => {});
  }
});

function configSummary(guild, rec, title = "Saved ✅") {
  const roles = rec.config.roleIds.length
    ? rec.config.roleIds.map((id) => `• ${roleLabel(guild, id)}`).join("\n")
    : "*none yet*";
  const chan = rec.config.channelId
    ? `<#${rec.config.channelId}>`
    : "*none yet*";
  return (
    `**${title}**\n` +
    `**Roles given when someone adopts the tag:**\n${roles}\n` +
    `**Announcement channel:** ${chan}\n` +
    `**Roles taken back when the tag is removed:** ${rec.config.removeRolesOnRemove ? "yes" : "no"}`
  );
}

function inviterText(rec) {
  if (rec.invitedBy) {
    const when = rec.invitedBy.at ? ` • <t:${unix(rec.invitedBy.at)}:R>` : "";
    return `<@${rec.invitedBy.id}> (${rec.invitedBy.username})${when}`;
  }
  return `Unknown${rec.inviterNote ? ` — ${rec.inviterNote}` : ""}\nSet it yourself with \`${PREFIX}setinviter <userId>\``;
}

async function runCommand(cmd, args, message) {
  const guild = message.guild;
  const rec = getGuildRec(guild);
  const quiet = { parse: [], repliedUser: false };
  const reply = (content) => message.reply({ content, allowedMentions: quiet });
  const replyEmbed = (embed) =>
    message.reply({ embeds: [embed], allowedMentions: quiet });
  const withNotes = (text, notes) =>
    notes.length ? `${text}\n\n${notes.join("\n")}` : text;

  // After roles change, top up everyone who already wears the tag (silently — no pings).
  const applyToHolders = async () => {
    const stats = await syncGuild(guild, {
      announce: false,
      ensure: true,
      source: "setup",
    });
    if (stats && stats.holders && rec.config.roleIds.length) {
      await message.channel.send({
        content: `✅ Checked the ${stats.holders} member(s) already wearing the tag — roles applied${stats.rolesFixed ? ` (${stats.rolesFixed} role(s) added)` : ""}.`,
        allowedMentions: quiet,
      });
    }
  };

  switch (cmd) {
    case "help": {
      const p = PREFIX;
      return replyEmbed(
        new EmbedBuilder()
          .setColor(COLOR.info)
          .setTitle("🌧️ Server tag bot — commands")
          .setDescription(
            [
              `\`${p}setup <roleId> [<roleId> …] #channel\` — role IDs to give (any number) + where to announce`,
              `\`${p}addrole <roleId> …\` / \`${p}removerole <roleId> …\` — change the role list`,
              `\`${p}setchannel #channel\` — change the announcement channel`,
              `\`${p}roles\` — show the roles and whether I can manage them`,
              `\`${p}autoremove on|off\` — take roles back when the tag is removed`,
              `\`${p}status\` — settings, who invited me, counts`,
              `\`${p}list\` — who wears the tag right now`,
              `\`${p}history [n]\` — latest adopt/remove events`,
              `\`${p}sync\` — re-check everyone right now`,
              `\`${p}setinviter <userId>\` — record who invited me (if I couldn't detect it)`,
              "",
              `Example: \`${p}setup 123456789012345678 234567890123456789 #tag-log\``,
              "Get a role ID: Developer Mode on → right-click the role → **Copy Role ID**. IDs never ping anyone (an @role does).",
            ].join("\n"),
          ),
      );
    }

    case "setup": {
      const { roles, channel, unknown } = parseTargets(guild, args);
      const notes = unknownNotes(unknown);
      if (!roles.length && !channel) {
        return reply(
          withNotes(
            `Usage: \`${PREFIX}setup <roleId> [<roleId> …] #channel\`\n` +
              `Example: \`${PREFIX}setup 123456789012345678 234567890123456789 #tag-log\`\n` +
              `Any number of role IDs (1, 2, 3 or more). Get one with Developer Mode on: right-click the role → **Copy Role ID**.`,
            notes,
          ),
        );
      }
      let changed = false;
      if (roles.length) {
        const ok = [];
        for (const role of roles) {
          const problem = roleProblem(guild, role);
          if (problem)
            notes.push(`⚠️ ${roleLabel(guild, role.id)} skipped — ${problem}`);
          else ok.push(role);
        }
        if (ok.length) {
          rec.config.roleIds = ok.map((r) => r.id);
          changed = true;
        }
      }
      if (channel) {
        const problem = channelProblem(guild, channel);
        if (problem) {
          notes.push(`⚠️ ${channel} skipped — ${problem}`);
        } else {
          rec.config.channelId = channel.id;
          changed = true;
        }
      }
      saveSoon();
      await reply(
        withNotes(
          configSummary(
            guild,
            rec,
            changed ? "Saved ✅" : "Nothing was changed",
          ),
          notes,
        ),
      );
      return changed ? applyToHolders() : undefined;
    }

    case "addrole": {
      const { roles, unknown } = parseTargets(guild, args);
      const notes = unknownNotes(unknown);
      if (!roles.length) {
        return reply(
          withNotes(`Usage: \`${PREFIX}addrole <roleId> [<roleId> …]\``, notes),
        );
      }
      let added = 0;
      for (const role of roles) {
        const problem = roleProblem(guild, role);
        if (problem) {
          notes.push(`⚠️ ${roleLabel(guild, role.id)} skipped — ${problem}`);
        } else if (rec.config.roleIds.includes(role.id)) {
          notes.push(`ℹ️ ${roleLabel(guild, role.id)} was already on the list`);
        } else {
          rec.config.roleIds.push(role.id);
          added++;
        }
      }
      saveSoon();
      await reply(
        withNotes(
          configSummary(guild, rec, added ? "Saved ✅" : "Nothing was changed"),
          notes,
        ),
      );
      return added ? applyToHolders() : undefined;
    }

    case "removerole": {
      const ids = args
        .flatMap((a) => a.split(","))
        .map((a) => a.replace(/[<@&>]/g, ""))
        .filter((a) => /^\d{15,25}$/.test(a));
      if (!ids.length)
        return reply(`Usage: \`${PREFIX}removerole <roleId> [<roleId> …]\``);
      const before = rec.config.roleIds.length;
      rec.config.roleIds = rec.config.roleIds.filter((id) => !ids.includes(id));
      saveSoon();
      const dropped = before - rec.config.roleIds.length;
      return reply(
        `${dropped ? `Removed ${dropped} role(s) from the list — new adopters won't get them (people who already have them keep them).` : "None of those IDs were on the list."}\n\n${configSummary(guild, rec, dropped ? "Saved ✅" : "Nothing was changed")}`,
      );
    }

    case "setchannel":
    case "channel": {
      const { channel, unknown } = parseTargets(guild, args);
      if (!channel)
        return reply(
          withNotes(
            `Usage: \`${PREFIX}setchannel #channel\``,
            unknownNotes(unknown),
          ),
        );
      const problem = channelProblem(guild, channel);
      if (problem) return reply(`⚠️ ${channel} — ${problem}`);
      rec.config.channelId = channel.id;
      saveSoon();
      return reply(configSummary(guild, rec));
    }

    case "roles": {
      if (!rec.config.roleIds.length) {
        return reply(
          `No roles set yet. Use \`${PREFIX}setup <roleId> [<roleId> …] #channel\` or \`${PREFIX}addrole <roleId>\`.`,
        );
      }
      const lines = rec.config.roleIds.map((id) => {
        const role = guild.roles.cache.get(id);
        if (!role)
          return `• ❓ ${roleLabel(guild, id)} — remove it with \`${PREFIX}removerole ${id}\``;
        const problem = roleProblem(guild, role);
        return `• ${problem ? "⚠️" : "✅"} ${roleLabel(guild, id)}${problem ? ` — ${problem}` : ""}`;
      });
      return reply(`**Roles given on tag adoption**\n${lines.join("\n")}`);
    }

    case "autoremove": {
      const v = (args[0] || "").toLowerCase();
      if (!["on", "off"].includes(v)) {
        return reply(
          `Usage: \`${PREFIX}autoremove on|off\` — currently **${rec.config.removeRolesOnRemove ? "on" : "off"}**.`,
        );
      }
      rec.config.removeRolesOnRemove = v === "on";
      saveSoon();
      return reply(configSummary(guild, rec));
    }

    case "status": {
      const me = await getMe(guild);
      const ok = (b) => (b ? "✅" : "❌");
      const health = [
        `${ok(me?.permissions.has(PermissionFlagsBits.ManageRoles))} Manage Roles`,
        `${ok(me?.permissions.has(PermissionFlagsBits.ViewAuditLog))} View Audit Log`,
        `${ok(guild.members.cache.size >= guild.memberCount * 0.95)} Members loaded: ${guild.members.cache.size}/${guild.memberCount}`,
      ].join("\n");
      let rolesText =
        rec.config.roleIds.map((id) => roleLabel(guild, id)).join("\n") ||
        `*none — use ${PREFIX}setup*`;
      if (rolesText.length > 1000) rolesText = `${rolesText.slice(0, 997)}…`;
      return replyEmbed(
        new EmbedBuilder()
          .setColor(COLOR.info)
          .setTitle(`🌧️ ${guild.name} — tag bot status`)
          .addFields(
            { name: "Roles", value: rolesText },
            {
              name: "Channel",
              value: rec.config.channelId
                ? `<#${rec.config.channelId}>`
                : `*none — use ${PREFIX}setup*`,
              inline: true,
            },
            {
              name: "Roles taken back",
              value: rec.config.removeRolesOnRemove ? "Yes" : "No",
              inline: true,
            },
            {
              name: "Tag holders",
              value: String(holderCount(rec)),
              inline: true,
            },
            {
              name: "Events logged",
              value: String(rec.history.length),
              inline: true,
            },
            {
              name: "Last full check",
              value: rec.lastSyncAt ? `<t:${unix(rec.lastSyncAt)}:R>` : "never",
              inline: true,
            },
            { name: "Invited by", value: inviterText(rec) },
            { name: "Health", value: health },
          ),
      );
    }

    case "list": {
      const holders = Object.entries(rec.members).filter(([, m]) => m.hasTag);
      if (!holders.length) return reply("Nobody is wearing the tag yet 🌧️");
      const lines = holders
        .slice(0, 40)
        .map(
          ([id, m]) =>
            `• <@${id}> — ${m.adoptedAt ? `since <t:${unix(m.adoptedAt)}:R>` : "had it before I started tracking"}`,
        );
      if (holders.length > 40) lines.push(`…and ${holders.length - 40} more`);
      return replyEmbed(
        new EmbedBuilder()
          .setColor(COLOR.adopt)
          .setTitle(`Tag holders (${holders.length})`)
          .setDescription(lines.join("\n")),
      );
    }

    case "history": {
      const n = Math.min(Math.max(parseInt(args[0], 10) || 10, 1), 25);
      const last = rec.history.slice(-n).reverse();
      if (!last.length)
        return reply("No tag adoptions or removals logged yet.");
      const lines = last.map(
        (h) =>
          `${h.action === "adopted" ? "➕" : "➖"} <@${h.userId}> **${h.action}**${h.reason === "left-server" ? " (left the server)" : ""} • <t:${unix(h.at)}:R>`,
      );
      return replyEmbed(
        new EmbedBuilder()
          .setColor(COLOR.info)
          .setTitle(`Last ${last.length} tag event(s)`)
          .setDescription(lines.join("\n")),
      );
    }

    case "sync": {
      if (syncing.has(guild.id))
        return reply("A check is already running — give it a moment.");
      const msg = await reply("🔄 Checking every member…");
      const stats = await syncGuild(guild, {
        announce: true,
        ensure: true,
        source: "manual-sync",
      });
      if (!stats)
        return msg.edit(
          "❌ Could not load the member list — is the **Server Members Intent** enabled for the bot?",
        );
      return msg.edit(
        stats.first
          ? `✅ Baseline saved — ${stats.holders} member(s) currently wear the tag (nobody pinged).`
          : `✅ Done — ${stats.holders} member(s) wear the tag • ${stats.adopted} new • ${stats.removed + stats.left} removed${stats.rolesFixed ? ` • ${stats.rolesFixed} role(s) topped up` : ""}.`,
      );
    }

    case "setinviter": {
      const id =
        (message.mentions.users.first()?.id ??
          (args[0] || "").replace(/\D/g, "")) ||
        null;
      const user = id ? await client.users.fetch(id).catch(() => null) : null;
      if (!user) return reply(`Usage: \`${PREFIX}setinviter <userId>\``);
      rec.invitedBy = {
        id: user.id,
        username: user.username,
        at: null,
        source: "manual",
      };
      delete rec.inviterNote;
      saveSoon();
      return reply(`Saved — invited by ${inviterText(rec)}`);
    }
  }
}

/* ═════════════════════════════ START ═════════════════════════════ */

process.on("unhandledRejection", (err) =>
  console.error("[unhandledRejection]", err),
);
for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => {
    saveNow();
    client.destroy();
    process.exit(0);
  });
}

// A real bot token always contains dots; the placeholder doesn't. Checking it this way means you can paste
// your token into the TOKEN line at the top without editing anything down here.
if (!TOKEN.includes(".")) {
  console.error(
    "❌ No bot token found: set the DISCORD_TOKEN env var, or paste your token into the TOKEN line at the top of index.js",
  );
  process.exit(1);
}

client.login(TOKEN).catch((err) => {
  console.error("❌ Login failed:", err.message);
  if (/token/i.test(err.message)) {
    console.error(
      "   → Token rejected: Developer Portal → your app → Bot → Reset Token, then use the NEW token.",
    );
  }
  if (/intent/i.test(err.message)) {
    console.error(
      "   → Developer Portal → your app → Bot → enable SERVER MEMBERS INTENT and MESSAGE CONTENT INTENT, then restart.",
    );
  }
  process.exit(1);
});
