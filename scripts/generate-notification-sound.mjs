#!/usr/bin/env node
/**
 * Generate a short notification WAV file and save to public/notification-bell.wav
 * No network required. Run: node scripts/generate-notification-sound.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '..', 'public');
const outPath = path.join(publicDir, 'notification-bell.wav');

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// WAV: 44-byte header + PCM mono 16-bit, 8kHz, ~0.4 sec = 6400 samples = 12800 bytes
const sampleRate = 8000;
const duration = 0.4;
const numSamples = Math.floor(sampleRate * duration);
const numChannels = 1;
const bitsPerSample = 16;
const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
const dataSize = numSamples * numChannels * (bitsPerSample / 8);
const fileSize = 36 + dataSize;

const buffer = Buffer.alloc(44 + dataSize);
let offset = 0;

function writeString(s) {
  for (let i = 0; i < s.length; i++) buffer[offset++] = s.charCodeAt(i);
}
function writeU32(n) {
  buffer[offset++] = n & 0xff;
  buffer[offset++] = (n >> 8) & 0xff;
  buffer[offset++] = (n >> 16) & 0xff;
  buffer[offset++] = (n >> 24) & 0xff;
}
function writeU16(n) {
  buffer[offset++] = n & 0xff;
  buffer[offset++] = (n >> 8) & 0xff;
}

// RIFF header
writeString('RIFF');
writeU32(fileSize);
writeString('WAVE');
writeString('fmt ');
writeU32(16);
writeU16(1); // PCM
writeU16(numChannels);
writeU32(sampleRate);
writeU32(byteRate);
writeU16(numChannels * (bitsPerSample / 8));
writeU16(bitsPerSample);
writeString('data');
writeU32(dataSize);

// Generate a short "ding" (880 Hz sine, fade in/out)
const freq = 880;
const twoPiF = (2 * Math.PI * freq) / sampleRate;
for (let i = 0; i < numSamples; i++) {
  const t = i / sampleRate;
  const envelope = Math.exp(-t * 8) * (1 - Math.exp(-t * 40));
  const sample = Math.max(-1, Math.min(1, Math.sin(twoPiF * i) * envelope * 0.4));
  const s16 = Math.floor(sample * 32767);
  buffer[offset++] = s16 & 0xff;
  buffer[offset++] = (s16 >> 8) & 0xff;
}

fs.writeFileSync(outPath, buffer);
console.log('Generated:', outPath);
