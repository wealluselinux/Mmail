import { NextRequest, NextResponse } from "next/server";
import { PREFS_COOKIE } from "@/lib/prefs";
import { encodePrefs, prefsCookieOptions } from "@/lib/prefs-server";
import {
  cookieBase,
  createSessionValue,
  getStoredSettings,
  readSession,
  SESSION_COOKIE,
  sessionMaxAge,
} from "@/lib/session";

export const dynamic = "force-dynamic";

/** POST /api/accounts/switch { sub } : makes one of the linked accounts the active one. */
export async function POST(req: NextRequest) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { sub?: unknown } | null;
  const sub = typeof body?.sub === "string" ? body.sub : "";
  // Only accounts already linked in this browser can be switched to.
  if (!session.subs.includes(sub)) {
    return NextResponse.json({ error: "unknown_account" }, { status: 400 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, createSessionValue(session.subs, sub), {
    ...cookieBase,
    maxAge: sessionMaxAge,
  });

  // Each account has its own saved look, so load the one belonging to this account.
  const saved = await getStoredSettings(sub);
  if (saved) res.cookies.set(PREFS_COOKIE, encodePrefs(saved), prefsCookieOptions);
  else res.cookies.delete(PREFS_COOKIE);
  return res;
}
