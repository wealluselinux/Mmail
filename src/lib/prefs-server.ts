import "server-only";
import { sanitizePrefs, type Prefs } from "./prefs";

export const prefsCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 365,
};

export function encodePrefs(prefs: Prefs): string {
  return Buffer.from(JSON.stringify(prefs), "utf8").toString("base64url");
}

/** Decodes the prefs cookie. Missing or tampered values simply yield the defaults. */
export function decodePrefs(raw: string | undefined): Prefs {
  if (!raw) return sanitizePrefs(null);
  try {
    return sanitizePrefs(JSON.parse(Buffer.from(raw, "base64url").toString("utf8")));
  } catch {
    return sanitizePrefs(null);
  }
}
