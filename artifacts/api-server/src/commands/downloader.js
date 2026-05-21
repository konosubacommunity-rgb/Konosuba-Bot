const { isOwner } = require('../utils/helpers');

async function handleDownloader(sock, message, command, args, sender, isGroup, groupJid) {
  const dest = isGroup ? groupJid : sender;
  const dlCmds = ['play', 'ytmp3', 'ytmp4', 'tiktok', 'instagram', 'facebook'];
  if (!dlCmds.includes(command)) return false;

  const url = args[0];

  if (command === 'play') {
    const query = args.join(' ');
    if (!query) {
      await sock.sendMessage(dest, { text: '❌ Usage: `.play <song name>`' }, { quoted: message });
      return true;
    }
    try {
      const yts = require('yt-search');
      await sock.sendMessage(dest, { text: `🔍 Searching for: *${query}*...` }, { quoted: message });
      const result = await yts(query);
      const video = result.videos[0];
      if (!video) {
        await sock.sendMessage(dest, { text: '❌ No results found!' }, { quoted: message });
        return true;
      }
      await sock.sendMessage(dest, {
        text: `🎵 *Found!*\n\n📌 Title: ${video.title}\n⏱️ Duration: ${video.timestamp}\n👁️ Views: ${video.views.toLocaleString()}\n🔗 URL: ${video.url}\n\n_Downloading audio..._`,
      }, { quoted: message });
      const ytdl = require('ytdl-core');
      const chunks = [];
      const stream = ytdl(video.url, { filter: 'audioonly', quality: 'lowestaudio' });
      stream.on('data', chunk => chunks.push(chunk));
      stream.on('end', async () => {
        const buffer = Buffer.concat(chunks);
        if (buffer.length > 16 * 1024 * 1024) {
          await sock.sendMessage(dest, { text: '❌ File too large to send (>16MB). Try a shorter song!' });
          return;
        }
        await sock.sendMessage(dest, {
          audio: buffer,
          mimetype: 'audio/mpeg',
          fileName: `${video.title}.mp3`,
          ptt: false,
        });
      });
      stream.on('error', async (err) => {
        await sock.sendMessage(dest, { text: `❌ Download failed: ${err.message}` });
      });
    } catch (err) {
      await sock.sendMessage(dest, { text: `❌ Error: ${err.message}` }, { quoted: message });
    }
    return true;
  }

  if (command === 'ytmp3') {
    if (!url || !url.includes('youtu')) {
      await sock.sendMessage(dest, { text: '❌ Usage: `.ytmp3 <youtube link>`' }, { quoted: message });
      return true;
    }
    try {
      await sock.sendMessage(dest, { text: '⬇️ Downloading audio...' }, { quoted: message });
      const ytdl = require('ytdl-core');
      const info = await ytdl.getInfo(url);
      const title = info.videoDetails.title;
      const chunks = [];
      const stream = ytdl(url, { filter: 'audioonly', quality: 'lowestaudio' });
      stream.on('data', chunk => chunks.push(chunk));
      stream.on('end', async () => {
        const buffer = Buffer.concat(chunks);
        if (buffer.length > 16 * 1024 * 1024) {
          await sock.sendMessage(dest, { text: '❌ File too large to send (>16MB)!' });
          return;
        }
        await sock.sendMessage(dest, {
          audio: buffer,
          mimetype: 'audio/mpeg',
          fileName: `${title}.mp3`,
          ptt: false,
        });
      });
      stream.on('error', async (err) => {
        await sock.sendMessage(dest, { text: `❌ Error: ${err.message}` });
      });
    } catch (err) {
      await sock.sendMessage(dest, { text: `❌ Error: ${err.message}` }, { quoted: message });
    }
    return true;
  }

  if (command === 'ytmp4') {
    if (!url || !url.includes('youtu')) {
      await sock.sendMessage(dest, { text: '❌ Usage: `.ytmp4 <youtube link>`' }, { quoted: message });
      return true;
    }
    try {
      await sock.sendMessage(dest, { text: '⬇️ Downloading video... (may take a while)' }, { quoted: message });
      const ytdl = require('ytdl-core');
      const info = await ytdl.getInfo(url);
      const title = info.videoDetails.title;
      const chunks = [];
      const stream = ytdl(url, { filter: 'videoandaudio', quality: 'lowest' });
      stream.on('data', chunk => chunks.push(chunk));
      stream.on('end', async () => {
        const buffer = Buffer.concat(chunks);
        if (buffer.length > 64 * 1024 * 1024) {
          await sock.sendMessage(dest, { text: '❌ Video too large to send (>64MB)! Try `.ytmp3` for audio only.' });
          return;
        }
        await sock.sendMessage(dest, {
          video: buffer,
          mimetype: 'video/mp4',
          fileName: `${title}.mp4`,
          caption: `🎬 ${title}`,
        });
      });
      stream.on('error', async (err) => {
        await sock.sendMessage(dest, { text: `❌ Error: ${err.message}` });
      });
    } catch (err) {
      await sock.sendMessage(dest, { text: `❌ Error: ${err.message}` }, { quoted: message });
    }
    return true;
  }

  if (command === 'tiktok' || command === 'instagram' || command === 'facebook') {
    if (!url) {
      await sock.sendMessage(dest, { text: `❌ Usage: \`.${command} <link>\`` }, { quoted: message });
      return true;
    }
    await sock.sendMessage(dest, {
      text: `⬇️ *${command.charAt(0).toUpperCase() + command.slice(1)} Downloader*\n\n🔗 Link: ${url}\n\n⚠️ This feature requires a third-party API. Please use a website like https://ssstik.io for TikTok or https://snapinsta.app for Instagram downloads for now.`,
    }, { quoted: message });
    return true;
  }

  return false;
}

module.exports = { handleDownloader };
