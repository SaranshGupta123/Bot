require("dotenv").config();

const {
  Client,
  Events,
  GatewayIntentBits,
  PermissionsBitField,
} = require("discord.js");
const { GoogleGenAI } = require("@google/genai");
const fs = require("fs");

// Initialize Discord Client and Gemini SDK
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MEMORY_FILE = "./memory.json";

// Load or initialize persistent memory store
let memories = fs.existsSync(MEMORY_FILE)
  ? JSON.parse(fs.readFileSync(MEMORY_FILE, "utf8"))
  : [];

function saveMemories() {
  fs.writeFileSync(MEMORY_FILE, JSON.stringify(memories, null, 2));
}

// Calculate similarity between two embedding vectors
function cosineSimilarity(vecA, vecB) {
  let dot = 0.0,
    normA = 0.0,
    normB = 0.0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Generate vector embedding for text
async function getEmbedding(text) {
  const response = await ai.models.embedContent({
    model: "gemini-embedding-2",
    contents: text,
  });
  return response.embeddings[0].values;
}

// Helper to store a single fact into memory.json
async function storeMemory(fact, author) {
  const embedding = await getEmbedding(fact);
  memories.push({
    fact,
    author,
    timestamp: new Date().toISOString(),
    embedding,
  });

  // Keep the 500 most recent learned memories to keep JSON fast
  if (memories.length > 500) memories.shift();
  saveMemories();
  console.log(`[Learned]: ${fact}`);
}

// SELF-TRAINING: Extract worthwhile facts from chat and store them
async function learnFromMessage(author, content) {
  if (content.length < 15) return; // Skip very short messages

  try {
    const extraction = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents: `Analyze this Discord message from user "${author}": "${content}".
If it contains a notable fact, user preference, server rule, project detail, or recurring joke worth remembering long-term, summarize it into ONE concise third-person sentence.
If it is just casual greetings, filler, or temporary chatter, reply with exact text: IGNORE`,
    });

    const fact = extraction.text.trim();
    if (fact === "IGNORE" || fact.length < 5) return;

    await storeMemory(fact, author);
  } catch (err) {
    console.error("Learning error:", err.message);
  }
}

// WEB LEARNING: Search the internet for a topic and memorize key facts
async function learnFromWeb(topic, author) {
  const searchResponse = await ai.models.generateContent({
    model: "gemini-3.5-flash-lite",
    contents: `Search the web for accurate, up-to-date information about: "${topic}".
Extract 3 to 5 standalone, concise, factual sentences summarizing the most important details.
Output ONLY the sentences, one per line, with no bullet points or numbering.`,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  const facts = searchResponse.text
    .split("\n")
    .map((line) => line.replace(/^[-*•\d.)\s]+/, "").trim())
    .filter((line) => line.length > 10);

  for (const fact of facts) {
    await storeMemory(fact, `Web (${author})`);
  }

  return facts;
}

// RETRIEVAL: Find the top 5 most relevant memories for a query
async function recallMemories(query) {
  if (memories.length === 0) return [];
  const queryEmbedding = await getEmbedding(query);

  return memories
    .map((mem) => ({
      fact: mem.fact,
      score: cosineSimilarity(queryEmbedding, mem.embedding),
    }))
    .filter((item) => item.score > 0.65) // Relevance threshold
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((item) => item.fact);
}

client.once(Events.ClientReady, (readyClient) => {
  console.log(
    `Logged in as ${readyClient.user.tag} | Loaded ${memories.length} memories.`,
  );
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;

  const trimmed = message.content.trim();
  const isTeachCmd = trimmed === "%teach" || trimmed.startsWith("%teach ");
  const isLearnWebCmd =
    trimmed === "%learnweb" || trimmed.startsWith("%learnweb ");
  const isMentioned = message.mentions.has(client.user);

  // Admins only: must be inside a server and have Discord Administrator permission
  if (!message.guild) {
    return message.reply(
      "❌ This bot can only be used inside a server by users with **Administrator** permission.",
    );
  }

  const isAdmin = message.member?.permissions.has(
    PermissionsBitField.Flags.Administrator,
  );

  if (!isAdmin) {
    if (isTeachCmd || isLearnWebCmd || isMentioned) {
      return message.reply(
        "❌ You need **Administrator** permission to use this bot.",
      );
    }
    return;
  }

  // COMMAND 1: Direct admin teaching (%teach <fact>)
  if (isTeachCmd) {
    const factToLearn = trimmed.slice(6).trim();
    if (!factToLearn) {
      return message.reply(
        "Usage: `%teach <something you want me to remember>`",
      );
    }

    try {
      await message.channel.sendTyping();
      await storeMemory(factToLearn, message.author.username);
      return message.reply(`Memorized: **${factToLearn}**`);
    } catch (err) {
      console.error(err);
      return message.reply("Failed to save that memory.");
    }
  }

  // COMMAND 2: Grab & learn data from the internet (%learnweb <topic>)
  if (isLearnWebCmd) {
    const topic = trimmed.slice(9).trim();
    if (!topic) {
      return message.reply(
        "Usage: `%learnweb <topic to research and memorize>`",
      );
    }

    try {
      await message.channel.sendTyping();
      const learnedFacts = await learnFromWeb(topic, message.author.username);

      if (learnedFacts.length === 0) {
        return message.reply("I couldn't extract clear facts for that topic.");
      }

      const formatted = learnedFacts.map((f) => `- ${f}`).join("\n");
      return message.reply(
        `Searched the web and memorized **${learnedFacts.length}** facts about **${topic}**:\n${formatted}`.slice(
          0,
          2000,
        ),
      );
    } catch (err) {
      console.error(err);
      return message.reply(
        "Hit an error while searching the web for that topic.",
      );
    }
  }

  const cleanPrompt = message.content
    .replace(`<@${client.user.id}>`, "")
    .trim();

  // 1. Observe and learn from admin chat in the background
  learnFromMessage(message.author.username, cleanPrompt);

  // 2. Reply when mentioned by an admin (with memory + live web search)
  if (isMentioned) {
    if (!cleanPrompt) return;
    await message.channel.sendTyping();

    try {
      const relevantFacts = await recallMemories(cleanPrompt);
      const memoryContext = relevantFacts.length
        ? `\n\nThings you have learned from this server:\n- ${relevantFacts.join("\n- ")}`
        : "";

      const response = await ai.models.generateContent({
        model: "gemini-4-hydrogen",
        contents: `${message.author.username} says: ${cleanPrompt}`,
        config: {
          tools: [{ googleSearch: {} }],
          systemInstruction:
            "You are a helpful, witty Discord bot that learns from server conversations and the web over time. Keep responses concise (under 1800 characters) and naturally use what you have learned when relevant." +
            memoryContext,
        },
      });

      await message.reply(response.text.slice(0, 2000));
    } catch (error) {
      console.error(error);
      await message.reply("I hit a snag trying to think of a reply.");
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
