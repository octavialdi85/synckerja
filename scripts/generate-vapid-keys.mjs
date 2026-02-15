#!/usr/bin/env node
/**
 * Generate VAPID keys for Live Chat Web Push.
 * Outputs:
 * 1) JSON for Supabase secret VAPID_KEYS (JWK format)
 * 2) Public key for frontend env VITE_VAPID_PUBLIC_KEY (base64url)
 *
 * Run: node scripts/generate-vapid-keys.mjs
 */

const crypto = globalThis.crypto || (await import('node:crypto')).webcrypto;
if (!crypto?.subtle) {
  console.error('Web Crypto (crypto.subtle) is required. Use Node 18+.');
  process.exit(1);
}

const keyPair = await crypto.subtle.generateKey(
  { name: 'ECDSA', namedCurve: 'P-256' },
  true,
  ['sign', 'verify']
);

const publicJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
const privateJwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey);
const vapidKeysJson = JSON.stringify({ publicKey: publicJwk, privateKey: privateJwk }, null, 2);

const rawPublic = new Uint8Array(await crypto.subtle.exportKey('raw', keyPair.publicKey));
const base64 = Buffer.from(rawPublic).toString('base64');
const applicationServerKey = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

console.log('=== Paste this as Supabase secret VAPID_KEYS (full JSON) ===');
console.log(vapidKeysJson);
console.log('');
console.log('=== Paste this as frontend env VITE_VAPID_PUBLIC_KEY ===');
console.log(applicationServerKey);
