require("dotenv").config();

module.exports = {
  token: process.env.DISCORD_TOKEN,

  playlist: [
    "lofi3.m4a",
    "lofi4.m4a",
    "lofi5.m4a",
    "lofi6.m4a",
    "lofi7.m4a",
    "lofi8.m4a",
    "lofi9.m4a",
    "http://lofi.stream.laut.fm/lofi",
  ],

  prefix: "!",
  botStatus: "🎵 Müzik Çalıyor",
  embedColor: "#ff0000",

  ownerIDs: ["693808757112569877", "644230438746980355"],

  emojis: {
    play: "▶️",
    pause: "⏸️",
    stop: "⏹️",
    queue: "📜",
    success: "✅",
    error: "❌",
    repeat: "🔁",
    skip: "⏭️",
  },

  messages: {
    notInVoice: "Bir ses kanalında olmalısınız!",
    notInSameVoice: "Benimle aynı ses kanalında olmalısınız!",
    noPermission: "Bu komutu kullanma yetkiniz yok!",
    noQueue: "Şu anda çalan bir şarkı yok!",
    addedToQueue: "Şarkı sıraya eklendi:",
    nowPlaying: "Şimdi çalıyor:",
    skipSong: "Şarkı geçildi!",
    stoppedPlaying: "Müzik durduruldu!",
    volumeChanged: "Ses seviyesi değiştirildi:",
    queueEnded: "Sıra bitti, ses kanalından ayrılıyorum!",
  },
};
