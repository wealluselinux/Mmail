import { createHash } from "node:crypto";

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";

/**
 * gmail.modify lets Mmail read mail and change labels (read/unread, star, archive, trash).
 * gmail.send lets it send what you compose, reply to and forward.
 */
export const GMAIL_MODIFY_SCOPE = "https://www.googleapis.com/auth/gmail.modify";
export const GMAIL_SEND_SCOPE = "https://www.googleapis.com/auth/gmail.send";
export const SCOPES = ["openid", "email", "profile", GMAIL_MODIFY_SCOPE, GMAIL_SEND_SCOPE];

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required environment variable: ${name}`);
  return v;
}

export function appUrl(): string {
  return env("APP_URL").replace(/\/$/, "");
}

export function redirectUri(): string {
  return `${appUrl()}/api/auth/callback`;
}

export function pkceChallenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

export function buildAuthUrl(state: string, codeChallenge: string): string {
  const params = new URLSearchParams({
    client_id: env("GOOGLE_CLIENT_ID"),
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: SCOPES.join(" "),
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    // offline + consent guarantees Google returns a refresh token
    access_type: "offline",
    prompt: "consent select_account",
    include_granted_scopes: "true",
  });
  return `${AUTH_URL}?${params}`;
}

type TokenResponse = {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
};

async function tokenRequest(body: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env("GOOGLE_CLIENT_ID"),
      client_secret: env("GOOGLE_CLIENT_SECRET"),
      ...body,
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Google token request failed (${res.status})`);
  return res.json();
}

export function exchangeCode(code: string, codeVerifier: string) {
  return tokenRequest({
    grant_type: "authorization_code",
    code,
    code_verifier: codeVerifier,
    redirect_uri: redirectUri(),
  });
}

export function refreshAccessToken(refreshToken: string) {
  return tokenRequest({ grant_type: "refresh_token", refresh_token: refreshToken });
}

export type GoogleProfile = {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
};

export async function fetchProfile(accessToken: string): Promise<GoogleProfile> {
  const res = await fetch(USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Google userinfo request failed (${res.status})`);
  return res.json();
}
