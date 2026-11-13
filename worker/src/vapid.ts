import { Env } from './types';

/**
 * Base64URL encode a byte array.
 */
export function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Base64URL decode a string to Uint8Array.
 */
export function base64UrlDecode(str: string): Uint8Array {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// In-memory cache for imported CryptoKey per invocation to avoid redundant key imports
let cachedCryptoKey: CryptoKey | null = null;
let cachedKeySignature: string | null = null;

/**
 * Imports the ECDSA P-256 private key as a JWK by combining the raw 32-byte 'd'
 * private key scalar with the 'x' and 'y' coordinates derived from the uncompressed public key.
 */
export async function getVapidPrivateKey(
  publicKeyBase64Url: string,
  privateKeyBase64Url: string
): Promise<CryptoKey> {
  const keySignature = `${publicKeyBase64Url}:${privateKeyBase64Url}`;
  if (cachedCryptoKey && cachedKeySignature === keySignature) {
    return cachedCryptoKey;
  }

  const pubBytes = base64UrlDecode(publicKeyBase64Url);
  if (pubBytes.length !== 65 || pubBytes[0] !== 0x04) {
    throw new Error(
      'Invalid VAPID_PUBLIC_KEY: must be a 65-byte uncompressed P-256 point starting with 0x04.'
    );
  }

  // Derive x and y coordinates from uncompressed public key point (0x04 || X (32 bytes) || Y (32 bytes))
  const x = base64UrlEncode(pubBytes.slice(1, 33));
  const y = base64UrlEncode(pubBytes.slice(33, 65));
  const d = privateKeyBase64Url;

  const jwk: JsonWebKey = {
    kty: 'EC',
    crv: 'P-256',
    x,
    y,
    d,
    ext: true,
  };

  const key = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  cachedCryptoKey = key;
  cachedKeySignature = keySignature;
  return key;
}

/**
 * Builds and signs an ES256 VAPID JWT token for a target push service audience.
 * Caches tokens per origin within the supplied cache Map to minimize CPU overhead.
 */
export async function getVapidToken(
  audienceOrigin: string,
  env: Env,
  cache?: Map<string, string>
): Promise<string> {
  if (cache && cache.has(audienceOrigin)) {
    return cache.get(audienceOrigin)!;
  }

  const privateKey = await getVapidPrivateKey(
    env.VAPID_PUBLIC_KEY,
    env.VAPID_PRIVATE_KEY
  );

  const header = {
    typ: 'JWT',
    alg: 'ES256',
  };

  const nowSeconds = Math.floor(Date.now() / 1000);
  const claims = {
    aud: audienceOrigin,
    exp: nowSeconds + 12 * 3600, // 12-hour expiration
    sub: env.VAPID_SUBJECT,
  };

  const textEncoder = new TextEncoder();
  const headerB64 = base64UrlEncode(textEncoder.encode(JSON.stringify(header)));
  const claimsB64 = base64UrlEncode(textEncoder.encode(JSON.stringify(claims)));
  const unsignedToken = `${headerB64}.${claimsB64}`;

  // Sign with WebCrypto ECDSA P-256 SHA-256 (returns raw IEEE P1363 r||s signature)
  const signatureBuffer = await crypto.subtle.sign(
    { name: 'ECDSA', hash: { name: 'SHA-256' } },
    privateKey,
    textEncoder.encode(unsignedToken)
  );

  const signatureB64 = base64UrlEncode(new Uint8Array(signatureBuffer));
  const jwt = `${unsignedToken}.${signatureB64}`;

  if (cache) {
    cache.set(audienceOrigin, jwt);
  }

  return jwt;
}

/**
 * Sends a payload-less Web Push notification to the given subscription endpoint.
 */
export async function sendPush(
  endpoint: string,
  env: Env,
  vapidCache?: Map<string, string>
): Promise<Response> {
  const url = new URL(endpoint);
  const audience = url.origin;
  const jwt = await getVapidToken(audience, env, vapidCache);

  return await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `vapid t=${jwt}, k=${env.VAPID_PUBLIC_KEY}`,
      TTL: '3600',
      Urgency: 'normal',
    },
    body: null,
  });
}
