import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { PrefsProvider } from "@/components/PrefsProvider";
import { PREFS_COOKIE } from "@/lib/prefs";
import { decodePrefs } from "@/lib/prefs-server";
import { getSessionUser, getStoredSettings } from "@/lib/session";

/** Wraps every signed-in page (/mail, /customize): auth check, preferences, optional top bar. */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  // The account's saved preferences are the source of truth. The cookie is only a copy
  // that lets the theme render instantly; it's the fallback until settings are first saved.
  const store = await cookies();
  const prefs =
    (await getStoredSettings(user.google_sub)) ?? decodePrefs(store.get(PREFS_COOKIE)?.value);
  const firstName = (user.name ?? user.email).split(/[ @]/)[0];

  return (
    <PrefsProvider initial={prefs}>
      <AppShell name={firstName}>{children}</AppShell>
    </PrefsProvider>
  );
}
