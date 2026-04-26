import { randomBytes } from "node:crypto";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  _resetKeyCache,
  decryptMessage,
  encryptMessage,
} from "@/lib/crypto/conversations";

beforeAll(() => {
  process.env.CONVERSATIONS_ENC_KEY = randomBytes(32).toString("base64");
});

afterEach(() => {
  _resetKeyCache();
});

describe("conversation crypto", () => {
  it("round-trips utf-8 plaintext", () => {
    const msg = encryptMessage("hello — 你好 — 🚀");
    expect(msg.ciphertext.length).toBeGreaterThan(0);
    expect(msg.nonce.length).toBe(12);
    expect(decryptMessage(msg)).toBe("hello — 你好 — 🚀");
  });

  it("uses a fresh nonce per message", () => {
    const a = encryptMessage("same plaintext");
    const b = encryptMessage("same plaintext");
    expect(a.nonce.equals(b.nonce)).toBe(false);
    expect(a.ciphertext.equals(b.ciphertext)).toBe(false);
  });

  it("rejects tampered ciphertext", () => {
    const msg = encryptMessage("secret");
    msg.ciphertext[0] ^= 0xff;
    expect(() => decryptMessage(msg)).toThrow();
  });

  it("rejects a wrong nonce length", () => {
    const msg = encryptMessage("secret");
    expect(() =>
      decryptMessage({ ciphertext: msg.ciphertext, nonce: Buffer.alloc(8) }),
    ).toThrow(/12-byte/);
  });
});
