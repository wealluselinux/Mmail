import { NextResponse } from "next/server";
import { randomToken } from "@/lib/crypto";
import { buildAuthUrl, pkceChallenge } from "@/lib/google";
import { cookieBase } from "@/lib/session";

export const dynamic = "force-dynamic";

/** Starts the Google sign-in flow (authorization code + PKCE). */
export async function GET() {
  const state = randomToken();
  const verifier = randomToken(48);

  const res = NextResponse.redirect(buildAuthUrl(state, pkceChallenge(verifier)));
  const short = { ...cookieBase, maxAge: 60 * 10 };
  res.cookies.set("mmail_oauth_state", state, short);
  res.cookies.set("mmail_oauth_verifier", verifier, short);
  return res;
}
