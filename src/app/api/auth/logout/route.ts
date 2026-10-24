import { NextResponse } from "next/server";
import { appUrl } from "@/lib/google";
import { SESSION_COOKIE } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * Signs out of every account in this browser by clearing the session cookie.
 * (To sign out of just one account, use /api/accounts/remove.)
 * Stored tokens stay encrypted in the database.
 */
export async function POST() {
  // 303 so the browser follows the redirect with GET
  const res = NextResponse.redirect(`${appUrl()}/`, 303);
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
