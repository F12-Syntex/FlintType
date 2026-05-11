import crypto from "node:crypto";
import { env, IS_DEV } from "./env";

/** AES-256-GCM at-rest encryption for user-supplied third-party API
 *  keys (e.g. MonkeyType Ape Keys). The encryption key lives in the
 *  `API_KEY_ENC_SECRET` env var (base64, 32 raw bytes). The DB only
 *  ever sees the ciphertext + IV + auth tag — the plaintext is never
 *  persisted.
 *
 *  Honesty caveat: this is at-rest encryption against a database
 *  leak. Anyone with code + env-var access to the running server
 *  (i.e. the operator) can decrypt. To make it truly invisible to
 *  the operator, the encryption key would need to be derived from
 *  something only the user knows (a passphrase) — Clerk-managed
 *  auth doesn't expose that today, so server-key envelope is the
 *  pragmatic best. Documented in the import dialog so the user
 *  knows what they're trusting.
 *
 *  Format on the wire/in DB:
 *    {
 *      v: 1,                  // scheme version, lets us rotate later
 *      iv: <base64>,          // 12 bytes
 *      tag: <base64>,         // 16 bytes
 *      ct: <base64>,          // ciphertext
 *    }
 */
export type EncryptedApiKey = {
  v: 1;
  iv: string;
  tag: string;
  ct: string;
};

const ALGO = "aes-256-gcm";
const IV_LEN = 12;

/** Resolve the 32-byte AES key. Production requires the env var; dev
 *  falls back to a deterministic key so contributors can run end-to
 *  end without a generated secret. The dev key is *intentionally*
 *  baked into the source so a leaked dev DB can't claim the key was
 *  secret — anyone reading the repo can decrypt dev data. */
function resolveKey(): Buffer {
  if (env.API_KEY_ENC_SECRET) {
    const buf = Buffer.from(env.API_KEY_ENC_SECRET, "base64");
    if (buf.length !== 32) {
      throw new Error(
        "API_KEY_ENC_SECRET must decode to exactly 32 bytes (base64-encoded AES-256 key).",
      );
    }
    return buf;
  }
  if (!IS_DEV) {
    throw new Error(
      "API_KEY_ENC_SECRET is required in production. Generate one with " +
        "`node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\"`.",
    );
  }
  // Dev fallback — public on purpose. Documented in the file
  // docblock above. NEVER use this in production. 32 bytes = 64 hex.
  return Buffer.from(
    "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    "hex",
  );
}

export function encryptApiKey(plaintext: string): EncryptedApiKey {
  const key = resolveKey();
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const ct = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return {
    v: 1,
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    ct: ct.toString("base64"),
  };
}

export function decryptApiKey(record: EncryptedApiKey): string {
  if (record.v !== 1) {
    throw new Error(`Unknown encryption scheme version: ${record.v}`);
  }
  const key = resolveKey();
  const iv = Buffer.from(record.iv, "base64");
  const tag = Buffer.from(record.tag, "base64");
  const ct = Buffer.from(record.ct, "base64");
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
  return pt.toString("utf8");
}

/** Cheap structural guard so the prefs reader can recognise an
 *  encrypted-key record without crashing on legacy plain strings. */
export function isEncryptedApiKey(v: unknown): v is EncryptedApiKey {
  if (!v || typeof v !== "object") return false;
  const r = v as Record<string, unknown>;
  return (
    r.v === 1 &&
    typeof r.iv === "string" &&
    typeof r.tag === "string" &&
    typeof r.ct === "string"
  );
}
