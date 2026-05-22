const { isOwner } = require('../utils/helpers');

async function handleDownloader(sock, message, command, args, sender, isGroup, groupJid) {
  const dest   = isGroup ? groupJid : sender;
  const dlCmds = ['play', 'ytmp3', 'ytmp4', 'tiktok', 'instagram', 'facebook'];
  if (!dlCmds.includes(command)) return false;

  const url = args[0];

  if (command === 'play') {
    const query = args.join(' ');
    if (!query) { await sock.sendMessage(dest, { text: '❌ Usage: `.play <song name>`' }, { quoted: message }); return true; }
    try {
      const yts = require('yt-search');
      await sock.sendMessage(dest, { text: `🔍 Searching for: *${query}*...` }, { quoted: message });
      const result = await yts(query);
      const video  = result.videos[0];
      if (!video) { await sock.sendMessage(dest, { text: '❌ No results found!' }, { quoted: message }); return true; }
      await sock.sendMessage(dest, {
        text: `🎵 *Found!*\n\n📌 ${video.title}\n⏱️ ${video.timestamp}\n👁️ ${video.views?.toLocaleString() ?? '?'} views\n🔗 ${video.url}\n\n_Downloading audio..._`,
      }, { quoted: message });
      const ytdl   = require('ytdl-core');
      const chunks = [];
      const stream = ytdl(video.url, { filter: 'audioonly', quality: 'lowestaudio' });
      stream.on('data', chunk => chunks.push(chunk));
      stream.on('end', async () => {
        const buffer = Buffer.concat(chunks);
        if (buffer.length > 16 * 1024 * 1024) { await sock.sendMessage(dest, { text: '❌ File too large (>16MB). Try a shorter song!' }); return; }
        await sock.sendMessage(dest, { audio: buffer, mimetype: 'audio/mpeg', fileName: `${video.title}.mp3`, ptt: false });
      });
      stream.on('error', async err => { await sock.sendMessage(dest, { text: `❌ Download failed: ${err.message}` }); });
    } catch (err) {
      await sock.sendMessage(dest, { text: `❌ Error: ${err.message}` }, { quoted: message });
    }
    return true;
  }

  if (command === 'ytmp3' || command === 'ytmp4') {
    if (!url) { await sock.sendMessage(dest, { text: `❌ Usage: \`.${command} <youtube URL>\`` }, { quoted: message }); return true; }
    try {
      const ytdl    = require('ytdl-core');
      const isVideo = command === 'ytmp4';
      await sock.sendMessage(dest, { text: `⬇️ Downloading ${isVideo ? 'video' : 'audio'}...` }, { quoted: message });
      const info    = await ytdl.getInfo(url);
      const title   = info.videoDetails.title;
      const chunks  = [];
      const stream  = ytdl(url, { filter: isVideo ? 'videoandaudio' : 'audioonly', quality: 'lowest' });
      stream.on('data', c => chunks.push(c));
      stream.on('end', async () => {
        const buffer = Buffer.concat(chunks);
        if (buffer.length > 16 * 1024 * 1024) { await sock.sendMessage(dest, { text: '❌ File too large (>16MB)!' }); return; }
        if (isVideo) {
          await sock.sendMessage(dest, { video: buffer, mimetype: 'video/mp4', fileName: `${title}.mp4` });
        } else {
          await sock.sendMessage(dest, { audio: buffer, mimetype: 'audio/mpeg', fileName: `${title}.mp3`, ptt: false });
        }
      });
      stream.on('error', async err => { await sock.sendMessage(dest, { text: `❌ Failed: ${err.message}` }); });
    } catch (err) {
      await sock.sendMessage(dest, { text: `❌ Error: ${err.message}` }, { quoted: message });
    }
    return true;
  }

  if (command === 'tiktok' || command === 'instagram' || command === 'facebook') {
    if (!url) { await sock.sendMessage(dest, { text: `❌ Usage: \`.${command} <url>\`` }, { quoted: message }); return true; }
    await sock.sendMessage(dest, { text: `⚠️ *${capitalize(command)} downloader coming soon!*\n\nFor now, try: \`.play\` for audio or \`.ytmp3\` for YouTube.` }, { quoted: message });
    return true;
  }

  return false;
}

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

module.exports = { handleDownloader };
