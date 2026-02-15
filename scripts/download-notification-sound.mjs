#!/usr/bin/env node
/**
 * Download a free notification sound to public/notification-bell.mp3
 * Used for inbound chat and review comment notifications.
 */
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '..', 'public');
const outPath = path.join(publicDir, 'notification-bell.mp3');

// Free notification sound (Pixabay Pixabay License - free for commercial use)
const SOUND_URL = 'https://cdn.pixabay.com/audio/2022/03/10/audio_381f1cbd2b.mp3';

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

const url = new URL(SOUND_URL);
const options = {
  hostname: url.hostname,
  path: url.pathname + url.search,
  headers: { 'User-Agent': 'Node.js (notification-sound-download)' },
};

const file = fs.createWriteStream(outPath);
https.get(options, (response) => {
  if (response.statusCode !== 200) {
    console.error('Download failed:', response.statusCode);
    process.exit(1);
  }
  response.pipe(file);
  file.on('finish', () => {
    file.close();
    console.log('Saved:', outPath);
  });
}).on('error', (err) => {
  fs.unlink(outPath, () => {});
  console.error('Download error:', err.message);
  process.exit(1);
});
