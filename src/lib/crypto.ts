import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function encryptionKey(): Buffer {
  const key = Buffer.from(requireEnv("TOKEN_ENCRYPTION_KEY"), "base64");
  if (key.length !== 32) {
    throw new Error("TOKEN_ENCRYPTION_KEY must be 32 bytes, base64 encoded");
  }
  return key;
}

/** AES-256-GCM. Output format: base64(iv | authTag | ciphertext). */
export function encrypt(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const data = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), data]).toString("base64");
}

export function decrypt(payload: string): string {
  const raw = Buffer.from(payload, "base64");
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const data = raw.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

function sessionSecret(): string {
  return requireEnv("SESSION_SECRET");
}

/** Signs a string value as `value.signature` (HMAC-SHA256, base64url). */
export function sign(value: string): string {
  const mac = createHmac("sha256", sessionSecret()).update(value).digest("base64url");
  return `${value}.${mac}`;
}

/** Returns the original value if the signature is valid, otherwise null. */
export function unsign(signed: string): string | null {
  const idx = signed.lastIndexOf(".");
  if (idx < 1) return null;
  const value = signed.slice(0, idx);
  const expected = createHmac("sha256", sessionSecret()).update(value).digest();
  let actual: Buffer;
  try {
    actual = Buffer.from(signed.slice(idx + 1), "base64url");
  } catch {
    return null;
  }
  if (actual.length !== expected.length) return null;
  return timingSafeEqual(actual, expected) ? value : null;
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}
