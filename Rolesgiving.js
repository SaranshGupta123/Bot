require('dotenv').config();
const fs = require('fs');
const {
  Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle,
  SlashCommandBuilder, PermissionFlagsBits, ChannelType, MessageFlags,
} = require('discord.js');

/* ───────────── storage (one auto-created file per server) ───────────── */
const DATA_DIR = './data';
fs.mkdirSync(DATA_DIR, { recursive: true });
const guildCache = new Map(); // guildId -> { panels: {} }
const guildFile = (id) => `${DATA_DIR}/${id}.json`;

function getGuild(guildId) {
  if (!guildCache.has(guildId)) {
    const file = guildFile(guildId);
    const data = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : { guildId, panels: {} };
    guildCache.set(guildId, data);
  }
  return guildCache.get(guildId);
}
const getDb = getGuild; // alias
const saveGuild = (guildId) => fs.writeFileSync(guildFile(guildId), JSON.stringify(getGuild(guildId), null, 2));
const sessions = new Map(); // `${userId}:${panelId}` -> { i, score, answers }
const eph = (content) => ({ content, flags: MessageFlags.Ephemeral });
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

/* ───────────── slash command ───────────── */
const panelOpt = (o) => o.setName('panel').setDescription('Which panel').setAutocomplete(true).setRequired(true);

const command = new SlashCommandBuilder()
  .setName('panel')
  .setDescription('Manage rules + quiz panels')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .setDMPermission(false)
  .addSubcommand((s) => s.setName('create').setDescription('Create a panel')
    .addStringOption((o) => o.setName('title').setDescription('Embed title').setRequired(true))
    .addStringOption((o) => o.setName('description').setDescription('Text above the rules'))
    .addStringOption((o) => o.setName('color').setDescription('Hex color, e.g. #ff69b4')))
  .addSubcommand((s) => s.setName('delete').setDescription('Delete a panel and its posted embeds').addStringOption(panelOpt))
  .addSubcommand((s) => s.setName('list').setDescription('List panels'))
  .addSubcommand((s) => s.setName('view').setDescription('Show rules, questions and settings').addStringOption(panelOpt))
  .addSubcommand((s) => s.setName('rule-add').setDescription('Add a rule')
    .addStringOption(panelOpt)
    .addStringOption((o) => o.setName('text').setDescription('Rule text').setRequired(true)))
  .addSubcommand((s) => s.setName('rule-remove').setDescription('Remove a rule by number')
    .addStringOption(panelOpt)
    .addIntegerOption((o) => o.setName('number').setDescription('Rule number').setRequired(true).setMinValue(1)))
  .addSubcommand((s) => s.setName('question-add').setDescription('Add a question')
    .addStringOption(panelOpt)
    .addStringOption((o) => o.setName('text').setDescription('The question').setRequired(true))
    .addStringOption((o) => o.setName('type').setDescription('Answer type').setRequired(true)
      .addChoices({ name: 'Options (dropdown)', value: 'choice' }, { name: 'Input field (typed)', value: 'text' }))
    .addStringOption((o) => o.setName('options').setDescription('Dropdown options: Yes, No, Maybe (not needed for input field)'))
    .addStringOption((o) => o.setName('correct').setDescription('Answer rule or coding condition, e.g. "age >= 18", "age < 18", "1", "paris|france"'))
    .addIntegerOption((o) => o.setName('score').setDescription('Points for a correct answer (optional, defaults to 1)').setMinValue(0)))
  .addSubcommand((s) => s.setName('question-remove').setDescription('Remove a question by number')
    .addStringOption(panelOpt)
    .addIntegerOption((o) => o.setName('number').setDescription('Question number').setRequired(true).setMinValue(1)))
  .addSubcommand((s) => s.setName('pass').setDescription('Give a role to users who reach a minimum score (10 min retest cooldown on fail)')
    .addStringOption(panelOpt)
    .addIntegerOption((o) => o.setName('min_score').setDescription('Minimum total score to pass').setRequired(true).setMinValue(1))
    .addRoleOption((o) => o.setName('role').setDescription('Role to give on pass').setRequired(true)))
  .addSubcommand((s) => s.setName('pass-clear').setDescription('Remove the pass role requirement').addStringOption(panelOpt))
  .addSubcommand((s) => s.setName('cooldown-clear').setDescription('Clear the 10-minute retest cooldown for a user')
    .addStringOption(panelOpt)
    .addUserOption((o) => o.setName('user').setDescription('User to clear cooldown for').setRequired(true)))
  .addSubcommand((s) => s.setName('log').setDescription('Send every submission to a channel')
    .addStringOption(panelOpt)
    .addChannelOption((o) => o.setName('channel').setDescription('Log channel').setRequired(true)
      .addChannelTypes(ChannelType.GuildText)))
  .addSubcommand((s) => s.setName('post').setDescription('Post the panel embed in a channel (can repeat for many channels)')
    .addStringOption(panelOpt)
    .addChannelOption((o) => o.setName('channel').setDescription('Where to post').setRequired(true)
      .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)));

/* ───────────── builders & helpers ───────────── */
const colorOf = (p) => p.color ?? 0x5865f2;
const maxScore = (p) => p.questions.reduce((a, q) => a + (q.score ?? 0), 0);

const isCode = (s) => typeof s === 'string' && /[><!=?:]|=>|\b(?:age|val|ans|input|score|value|x)\b|\d+\+/i.test(s.trim());

function extractNumber(text) {
  if (typeof text !== 'string') return null;
  const t = text.trim().toLowerCase();

  const underMatch = t.match(/(?:under|below|less\s+than|<\s*|younger\s+than)\s*(\d+(?:\.\d+)?)/i);
  if (underMatch) return parseFloat(underMatch[1]) - 1;

  const overMatch = t.match(/(?:over|above|more\s+than|>\s*|older\s+than)\s*(\d+(?:\.\d+)?)(?!\s*(?:or\s+(?:more|equal|older)|and\s+(?:above|older)|\+))/i);
  if (overMatch) return parseFloat(overMatch[1]) + 1;

  const orMoreMatch = t.match(/(\d+(?:\.\d+)?)\s*(?:or\s+(?:more|older)|and\s+(?:above|older)|\+|\s*>=\s*)/i);
  if (orMoreMatch) return parseFloat(orMoreMatch[1]);

  const orLessMatch = t.match(/(\d+(?:\.\d+)?)\s*(?:or\s+(?:less|younger)|and\s+(?:below|younger)|\s*<=\s*)/i);
  if (orLessMatch) return parseFloat(orLessMatch[1]);

  const numMatch = t.match(/[-+]?\d+(?:\.\d+)?/);
  if (numMatch) return parseFloat(numMatch[0]);

  return null;
}

function evaluateExpression(expr, num, text) {
  let cleaned = expr.trim();
  cleaned = cleaned.replace(/\bor\b/gi, '||').replace(/\band\b/gi, '&&');
  if (/^[><!=]=?\s*\d+/.test(cleaned)) cleaned = 'age ' + cleaned;
  if (/^\d+\+$/.test(cleaned)) cleaned = 'age >= ' + cleaned.replace('+', '');
  cleaned = cleaned.replace(/(?<![<>=!])=(?!=)/g, '==');

  try {
    const fn = new Function('age', 'x', 'val', 'ans', 'input', 'text', 'value', 'answer', 'n',
      'try { return (' + cleaned + '); } catch(e) { return null; }'
    );
    const n = Number.isFinite(num) ? num : NaN;
    return fn(n, n, n, n, n, text, text, text, n);
  } catch (e) {
    return null;
  }
}

function evaluateRule(ruleStr, num, text, qScore = 1) {
  if (!ruleStr) return { correct: null, score: qScore || 0 };

  if (!ruleStr.includes('?') && (ruleStr.includes(':') || ruleStr.includes('=>'))) {
    const parts = ruleStr.split(/[,;\n]+/).map((p) => p.trim()).filter(Boolean);
    for (const part of parts) {
      const match = part.match(/^(.+?)\s*(?:=>|:)\s*(\d+(?:\.\d+)?)$/);
      if (match) {
        const cond = match[1].trim();
        const pts = parseFloat(match[2]);
        const res = evaluateExpression(cond, num, text);
        if (res === true) {
          return { correct: pts > 0, score: pts };
        }
      }
    }
    return { correct: false, score: 0 };
  }

  const res = evaluateExpression(ruleStr, num, text);
  if (typeof res === 'boolean') {
    return { correct: res, score: res ? (qScore || 1) : 0 };
  }
  if (typeof res === 'number') {
    return { correct: res > 0, score: res };
  }
  return null;
}

function panelMessage(p) {
  const rules = p.rules.length ? p.rules.map((r, n) => `**${n + 1}.** ${r}`).join('\n') : '_No rules yet._';
  const embed = new EmbedBuilder()
    .setTitle(p.title)
    .setDescription(((p.description ? p.description + '\n\n' : '') + rules).slice(0, 4096))
    .setColor(colorOf(p))
    .setFooter({ text: p.questions.length ? `${p.questions.length} question(s)` : 'No questions yet' });
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`start:${p.id}`).setLabel('Start').setStyle(ButtonStyle.Success).setDisabled(!p.questions.length),
  );
  return { embeds: [embed], components: [row] };
}

async function refreshPosts(p) {
  for (const post of [...p.posts]) {
    try {
      const ch = await client.channels.fetch(post.channelId);
      const msg = await ch.messages.fetch(post.messageId);
      await msg.edit(panelMessage(p));
    } catch {
      p.posts = p.posts.filter((x) => x !== post); // message/channel gone
    }
  }
  saveGuild(p.guildId);
}

function renderQuestion(p, s) {
  const q = p.questions[s.i];
  const embed = new EmbedBuilder()
    .setColor(colorOf(p))
    .setTitle(`Question ${s.i + 1}/${p.questions.length}`)
    .setDescription(q.text)
    .setFooter({ text: q.score != null ? `Worth ${q.score} point(s)` : p.title });
  const row = new ActionRowBuilder();
  if (q.type === 'choice') {
    row.addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`ans:${p.id}:${s.i}`)
        .setPlaceholder('Choose an answer')
        .addOptions(q.options.map((o, idx) => ({ label: o.slice(0, 100), value: String(idx) }))),
    );
  } else {
    row.addComponents(new ButtonBuilder().setCustomId(`txt:${p.id}:${s.i}`).setLabel('Type your answer').setStyle(ButtonStyle.Primary));
  }
  return { content: null, embeds: [embed], components: [row] };
}

/* ───────────── quiz logic ───────────── */
async function recordAnswer(i, p, s, value) {
  const q = p.questions[s.i];
  let correct = null;
  let shown = value;
  let earnedScore = 0;

  if (q.type === 'choice') {
    const idx = Number(value);
    shown = q.options[idx] ?? value;
  } else {
    shown = String(value ?? '').trim();
  }

  const num = extractNumber(shown);
  const isRule = q.rule || (typeof q.correct === 'string' && isCode(q.correct));

  if (isRule) {
    const ruleStr = q.rule || q.correct;
    const res = evaluateRule(ruleStr, num, shown, q.score ?? 1);
    if (res) {
      correct = res.correct;
      earnedScore = res.score;
    }
  } else if (Array.isArray(q.correct) && q.correct.length > 0) {
    if (q.type === 'choice') {
      correct = q.correct.includes(Number(value));
    } else {
      correct = q.correct.some((a) => String(a).toLowerCase() === shown.toLowerCase());
    }
    if (correct && q.score != null) earnedScore = q.score;
  } else if (typeof q.correct === 'string' && q.correct.length > 0) {
    const accepted = q.correct.split('|').map((a) => a.trim().toLowerCase());
    correct = accepted.includes(shown.toLowerCase());
    if (correct && q.score != null) earnedScore = q.score;
  } else if (q.score != null) {
    earnedScore = q.score;
  }

  s.score += earnedScore;
  s.answers.push({ q: q.text, a: shown, correct, score: earnedScore });
  s.i += 1;

  const payload = s.i < p.questions.length ? renderQuestion(p, s) : await finish(i, p, s);
  if (i.isFromMessage?.() || i.isMessageComponent()) return i.update(payload);
  return i.reply({ ...payload, flags: MessageFlags.Ephemeral });
}

async function finish(i, p, s) {
  sessions.delete(`${i.user.id}:${p.id}`);
  const scored = maxScore(p) > 0;
  const embed = new EmbedBuilder().setColor(colorOf(p)).setTitle('Finished ✅');
  const lines = ['Thanks for completing it!'];

  if (scored) lines.push(`**Score:** ${s.score}/${maxScore(p)}`);

  if (p.pass) {
    if (s.score >= p.pass.min) {
      if (p.cooldowns?.[i.user.id]) {
        delete p.cooldowns[i.user.id];
        saveGuild(p.guildId);
      }
      try {
        const role = await i.guild.roles.fetch(p.pass.roleId);
        if (!role) throw new Error('role missing');
        await i.member.roles.add(role, `Passed "${p.title}"`);
        lines.push(`🎉 You passed and received <@&${role.id}>!`);
      } catch (e) {
        console.error('Role add failed:', e.message);
        lines.push('You passed, but I could not give the role. Please tell an admin (my role must be above it + Manage Roles).');
      }
    } else {
      const RETEST_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes
      const retryAt = Date.now() + RETEST_COOLDOWN_MS;
      p.cooldowns = p.cooldowns || {};
      p.cooldowns[i.user.id] = retryAt;
      saveGuild(p.guildId);

      const retrySec = Math.floor(retryAt / 1000);
      lines.push(`❌ You needed **${p.pass.min}** to pass. No role given.`);
      lines.push(`⏳ You failed the test. You can retest in 10 minutes (<t:${retrySec}:R>).`);
    }
  }
  embed.setDescription(lines.join('\n'));

  // optional submission log
  if (p.logChannelId) {
    try {
      const ch = await client.channels.fetch(p.logChannelId);
      const log = new EmbedBuilder()
        .setColor(colorOf(p))
        .setTitle(`Submission • ${p.title}`)
        .setDescription(`<@${i.user.id}> (${i.user.tag})${scored ? `\nScore: **${s.score}/${maxScore(p)}**` : ''}`)
        .addFields(s.answers.slice(0, 25).map((a, n) => ({
          name: `${n + 1}. ${a.q}`.slice(0, 256),
          value: `${a.a || '—'}${a.correct === null ? '' : a.correct ? ' ✅' : ' ❌'}${a.score ? ` (+${a.score})` : ''}`.slice(0, 1024),
        })))
        .setTimestamp();
      await ch.send({ embeds: [log] });
    } catch (e) { console.error('Log failed:', e.message); }
  }
  return { content: null, embeds: [embed], components: [] };
}

async function handleComponent(i) {
  const [kind, pid, qi] = i.customId.split(':');
  if (!['start', 'ans', 'txt', 'modal'].includes(kind)) return;
  const p = getDb(i.guildId).panels[pid];
  if (!p) return i.reply(eph('This panel no longer exists.'));
  const key = `${i.user.id}:${pid}`;

  if (kind === 'start') {
    if (!p.questions.length) return i.reply(eph('No questions have been set up yet.'));

    if (p.pass) {
      if (i.member.roles.cache.has(p.pass.roleId)) return i.reply(eph('You already have the pass role ✅'));

      const retryAt = p.cooldowns?.[i.user.id];
      if (retryAt) {
        if (Date.now() < retryAt) {
          const retrySec = Math.floor(retryAt / 1000);
          return i.reply(eph(`⏳ You did not pass the test recently. You can retest <t:${retrySec}:R> (at <t:${retrySec}:t>).`));
        } else {
          delete p.cooldowns[i.user.id];
          saveGuild(p.guildId);
        }
      }
    }

    const s = { i: 0, score: 0, answers: [] };
    sessions.set(key, s);
    return i.reply({ ...renderQuestion(p, s), flags: MessageFlags.Ephemeral });
  }

  const s = sessions.get(key);
  if (!s || s.i !== Number(qi)) return i.reply(eph('This question has expired. Press **Start** again.'));

  if (kind === 'ans') return recordAnswer(i, p, s, i.values[0]);

  if (kind === 'txt') {
    const modal = new ModalBuilder().setCustomId(`modal:${pid}:${qi}`).setTitle(`Question ${s.i + 1}`)
      .addComponents(new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('a').setLabel('Your answer').setStyle(TextInputStyle.Paragraph)
          .setRequired(true).setMaxLength(1000)));
    return i.showModal(modal);
  }

  if (kind === 'modal') return recordAnswer(i, p, s, i.fields.getTextInputValue('a'));
}

/* ───────────── admin commands ───────────── */
async function handleCommand(i) {
  if (!i.guildId) return i.reply(eph('Use this in a server.'));
  if (!i.memberPermissions.has(PermissionFlagsBits.Administrator)) return i.reply(eph('Admins only.'));
  const save = () => saveGuild(i.guildId);
  const sub = i.options.getSubcommand();

  if (sub === 'create') {
    let color = 0x5865f2;
    const c = i.options.getString('color');
    if (c) {
      color = parseInt(c.replace('#', ''), 16);
      if (Number.isNaN(color)) return i.reply(eph('Invalid hex color.'));
    }
    const id = uid();
    getDb(i.guildId).panels[id] = {
      id, guildId: i.guildId, title: i.options.getString('title'), description: i.options.getString('description') || '',
      color, rules: [], questions: [], pass: null, logChannelId: null, posts: [], cooldowns: {},
    };
    save(i.guildId);
    return i.reply(eph(`Created **${getDb(i.guildId).panels[id].title}**. Now use \`/panel rule-add\`, \`/panel question-add\` and \`/panel post\`.`));
  }

  if (sub === 'list') {
    const all = Object.values(getDb(i.guildId).panels);
    return i.reply(eph(all.length ? all.map((p) => `• **${p.title}** — ${p.rules.length} rules, ${p.questions.length} questions, ${p.posts.length} posts`).join('\n') : 'No panels yet.'));
  }

  const p = getDb(i.guildId).panels[i.options.getString('panel')];
  if (!p) return i.reply(eph('Panel not found.'));

  switch (sub) {
    case 'delete': {
      for (const post of p.posts) {
        try { (await (await client.channels.fetch(post.channelId)).messages.fetch(post.messageId)).delete(); } catch { /* ignore */ }
      }
      delete getDb(i.guildId).panels[p.id]; save(i.guildId);
      return i.reply(eph('Panel deleted.'));
    }
    case 'view': {
      const qs = p.questions.map((q, n) => {
        let opts = '';
        if (q.type === 'choice') {
          if (Array.isArray(q.correct)) {
            opts = ' [' + q.options.map((o, k) => (q.correct.includes(k) ? `**${o}**` : o)).join(' / ') + ']';
          } else {
            opts = ' [' + q.options.join(' / ') + ']';
          }
        }
        let ruleInfo = '';
        if (q.rule || (typeof q.correct === 'string' && isCode(q.correct))) {
          ruleInfo = ` (rule: \`${q.rule || q.correct}\`)`;
        } else if (Array.isArray(q.correct) && q.type === 'text') {
          ruleInfo = ` (accepts: ${q.correct.join(' | ')})`;
        } else if (typeof q.correct === 'string' && q.type === 'text') {
          ruleInfo = ` (accepts: ${q.correct})`;
        } else if (!q.correct && q.score == null) {
          ruleInfo = ' (free response)';
        }
        return `**${n + 1}.** ${q.text}${opts}${ruleInfo}${q.score != null ? ` — ${q.score} pt` : ''}`;
      }).join('\n') || '_none_';
      const embed = new EmbedBuilder().setTitle(`Panel: ${p.title}`).setColor(colorOf(p)).addFields(
        { name: 'Rules', value: (p.rules.map((r, n) => `${n + 1}. ${r}`).join('\n') || '_none_').slice(0, 1024) },
        { name: 'Questions', value: qs.slice(0, 1024) },
        { name: 'Pass role', value: p.pass ? `<@&${p.pass.roleId}> at ${p.pass.min}/${maxScore(p)} points (10m fail cooldown)` : 'Not set (no roles given)', inline: true },
        { name: 'Log channel', value: p.logChannelId ? `<#${p.logChannelId}>` : 'Not set', inline: true },
        { name: 'Posted in', value: p.posts.map((x) => `<#${x.channelId}>`).join(', ') || 'nowhere yet' },
      );
      return i.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
    case 'rule-add': {
      p.rules.push(i.options.getString('text')); save(i.guildId); await refreshPosts(p);
      return i.reply(eph(`Rule #${p.rules.length} added.`));
    }
    case 'rule-remove': {
      const n = i.options.getInteger('number');
      if (n > p.rules.length) return i.reply(eph('No rule with that number.'));
      p.rules.splice(n - 1, 1); save(i.guildId); await refreshPosts(p);
      return i.reply(eph('Rule removed.'));
    }
    case 'question-add': {
      const type = i.options.getString('type');
      const optsRaw = i.options.getString('options');
      const correctRaw = i.options.getString('correct');
      const score = i.options.getInteger('score');
      const q = { id: uid(), type, text: i.options.getString('text'), options: [], correct: null, score: null };

      if (type === 'choice') {
        q.options = (optsRaw || '').split(',').map((s) => s.trim()).filter(Boolean);
        if (q.options.length < 2 || q.options.length > 25) {
          return i.reply(eph('Give 2–25 options separated by commas in `options` for dropdown.'));
        }
      }

      if (correctRaw) {
        const cTrim = correctRaw.trim();
        if (isCode(cTrim)) {
          q.correct = cTrim;
          q.rule = cTrim;
        } else if (type === 'choice') {
          const parts = cTrim.split(',').map((n) => parseInt(n.trim(), 10) - 1);
          if (parts.length && parts.every((n) => !Number.isNaN(n) && n >= 0 && n < q.options.length)) {
            q.correct = parts;
          } else {
            q.correct = cTrim;
          }
        } else {
          const parts = cTrim.split('|').map((s) => s.trim()).filter(Boolean);
          q.correct = parts.length > 1 ? parts : cTrim;
        }
      }

      if (score !== null) {
        q.score = score;
      } else if (q.correct) {
        if (typeof q.correct === 'string' && (q.correct.includes(':') || q.correct.includes('=>'))) {
          const matches = [...q.correct.matchAll(/(?:=>|:)\s*(\d+(?:\.\d+)?)/g)].map((m) => parseFloat(m[1]));
          q.score = matches.length ? Math.max(...matches) : 1;
        } else {
          q.score = 1;
        }
      }

      p.questions.push(q); save(i.guildId); await refreshPosts(p);
      return i.reply(eph(`Question #${p.questions.length} added${q.score != null ? ` (${q.score} pt)` : ' (not scored)'}.`));
    }
    case 'question-remove': {
      const n = i.options.getInteger('number');
      if (n > p.questions.length) return i.reply(eph('No question with that number.'));
      p.questions.splice(n - 1, 1); save(i.guildId); await refreshPosts(p);
      return i.reply(eph('Question removed. Re-check `/panel pass` if scoring changed.'));
    }
    case 'pass': {
      const min = i.options.getInteger('min_score');
      const role = i.options.getRole('role');
      if (maxScore(p) === 0) return i.reply(eph('Add at least one scored question first.'));
      if (min > maxScore(p)) return i.reply(eph(`Max possible score is ${maxScore(p)}.`));
      if (!role.editable) return i.reply(eph('I can\'t manage that role. Move my bot role above it and give me Manage Roles.'));
      p.pass = { min, roleId: role.id }; save(i.guildId);
      return i.reply(eph(`Users scoring **${min}+** will get ${role}. Failed users must wait 10 minutes to retest.`));
    }
    case 'pass-clear': { p.pass = null; save(i.guildId); return i.reply(eph('Pass role requirement removed.')); }
    case 'cooldown-clear': {
      const user = i.options.getUser('user');
      if (p.cooldowns && p.cooldowns[user.id]) {
        delete p.cooldowns[user.id];
        save(i.guildId);
        return i.reply(eph(`Cleared 10-minute cooldown for <@${user.id}> on "${p.title}".`));
      }
      return i.reply(eph(`<@${user.id}> does not have an active cooldown on "${p.title}".`));
    }
    case 'log': { p.logChannelId = i.options.getChannel('channel').id; save(i.guildId); return i.reply(eph('Submissions will be logged there.')); }
    case 'post': {
      const ch = i.options.getChannel('channel');
      try {
        const msg = await ch.send(panelMessage(p));
        p.posts.push({ channelId: ch.id, messageId: msg.id }); save(i.guildId);
        return i.reply(eph(`Posted in ${ch}.`));
      } catch {
        return i.reply(eph('I can\'t send messages in that channel (check my permissions).'));
      }
    }
  }
}

/* ───────────── wiring ───────────── */
client.on('interactionCreate', async (i) => {
  try {
    if (!i.guildId) return;
    if (i.isAutocomplete()) {
      const typed = i.options.getFocused().toLowerCase();
      return i.respond(Object.values(getDb(i.guildId).panels)
        .filter((p) => p.title.toLowerCase().includes(typed)).slice(0, 25)
        .map((p) => ({ name: p.title.slice(0, 100), value: p.id })));
    }
    if (i.isChatInputCommand()) return await handleCommand(i);
    if (i.isButton() || i.isStringSelectMenu() || i.isModalSubmit()) return await handleComponent(i);
  } catch (e) {
    console.error(e);
    if (i.isRepliable() && !i.replied && !i.deferred) i.reply(eph('Something went wrong.')).catch(() => {});
  }
});

client.once("clientReady", async () => {
  await client.application.commands.set([command]); // global: works in every server the bot joins
  console.log(
    `Logged in as ${client.user.tag} in ${client.guilds.cache.size} server(s)`,
  );
});

client.login(process.env.DISCORD_TOKEN1);
