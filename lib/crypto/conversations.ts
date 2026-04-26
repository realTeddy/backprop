import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * Conversation-history encryption.
 *
 * Algorithm: ChaCha20-Poly1305 (RFC 8439, the algorithm Node ships natively).
 *   - 32-byte key, base64 in CONVERSATIONS_ENC_KEY
 *   - 12-byte random nonce per message
 *   - 16-byte auth tag appended to the ciphertext
 *
 * The original plan documented XChaCha20 (24-byte nonce). Node's built-in
 * crypto only ships the 12-byte ChaCha20-Poly1305 variant, and rotating to
 * libsodium for one feature is not worth the WASM-init cost. With a 12-byte
 * random nonce per message, the birthday bound is ~2^48 messages per key
 * before collisions become a concern — orders of magnitude beyond what this
 * app will ever produce.
 */

const KEY_BYTES = 32;
const NONCE_BYTES = 12;
const TAG_BYTES = 16;

let cachedKey: Buffer | null = null;

function getKey(): Buffer {
  if (cachedKey) return cachedKey;
  const raw = process.env.CONVERSATIONS_ENC_KEY;
  if (!raw) {
    throw new Error("CONVERSATIONS_ENC_KEY is not set");
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== KEY_BYTES) {
    throw new Error(
      `CONVERSATIONS_ENC_KEY must decode to ${KEY_BYTES} bytes (got ${key.length})`,
    );
  }
  cachedKey = key;
  return key;
}

export type EncryptedMessage = {
  ciphertext: Buffer;
  nonce: Buffer;
};

export function encryptMessage(plaintext: string): EncryptedMessage {
  const key = getKey();
  const nonce = randomBytes(NONCE_BYTES);
  const cipher = createCipheriv("chacha20-poly1305", key, nonce, {
    authTagLength: TAG_BYTES,
  });
  const enc = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return { ciphertext: Buffer.concat([enc, tag]), nonce };
}

export function decryptMessage(message: EncryptedMessage): string {
  const key = getKey();
  const { ciphertext, nonce } = message;
  if (nonce.length !== NONCE_BYTES) {
    throw new Error(`expected ${NONCE_BYTES}-byte nonce`);
  }
  const tag = ciphertext.subarray(ciphertext.length - TAG_BYTES);
  const body = ciphertext.subarray(0, ciphertext.length - TAG_BYTES);
  const decipher = createDecipheriv("chacha20-poly1305", key, nonce, {
    authTagLength: TAG_BYTES,
  });
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(body), decipher.final()]).toString(
    "utf8",
  );
}

/** Reset cached key — used by tests. */
export function _resetKeyCache(): void {
  cachedKey = null;
}
