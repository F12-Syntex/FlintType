import { describe, expect, it } from "vitest";
import {
  decryptApiKey,
  encryptApiKey,
  isEncryptedApiKey,
} from "./api-key-crypto";

describe("api-key-crypto", () => {
  it("round-trips a typical Ape Key", () => {
    const plain = "abcd-1234-EFGH-5678";
    const enc = encryptApiKey(plain);
    expect(enc.v).toBe(1);
    expect(enc.iv.length).toBeGreaterThan(0);
    expect(enc.tag.length).toBeGreaterThan(0);
    expect(enc.ct).not.toContain(plain);
    expect(decryptApiKey(enc)).toBe(plain);
  });

  it("produces different ciphertext on each call (fresh IV)", () => {
    const plain = "same-input";
    const a = encryptApiKey(plain);
    const b = encryptApiKey(plain);
    expect(a.iv).not.toBe(b.iv);
    expect(a.ct).not.toBe(b.ct);
    expect(decryptApiKey(a)).toBe(plain);
    expect(decryptApiKey(b)).toBe(plain);
  });

  it("fails to decrypt if the auth tag is tampered", () => {
    const enc = encryptApiKey("secret");
    const tampered = {
      ...enc,
      tag: Buffer.from("AAAAAAAAAAAAAAAAAAAAAA==", "base64").toString(
        "base64",
      ),
    };
    expect(() => decryptApiKey(tampered)).toThrow();
  });

  it("isEncryptedApiKey recognises records and rejects plain strings", () => {
    const enc = encryptApiKey("k");
    expect(isEncryptedApiKey(enc)).toBe(true);
    expect(isEncryptedApiKey("plain string")).toBe(false);
    expect(isEncryptedApiKey(null)).toBe(false);
    expect(isEncryptedApiKey({ v: 1 })).toBe(false);
  });
});
