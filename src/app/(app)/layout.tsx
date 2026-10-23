import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { PrefsProvider } from "@/components/PrefsProvider";
import { PREFS_COOKIE } from "@/lib/prefs";
import { decodePrefs } from "@/lib/prefs-server";
import { getSessionUser } from "@/lib/session";

/** Wraps every signed-in page (/mail, /customize): auth check, preferences, optional top bar. */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const store = await cookies();
  const prefs = decodePrefs(store.get(PREFS_COOKIE)?.value);
  const firstName = (user.name ?? user.email).split(/[ @]/)[0];

  return (
    <PrefsProvider initial={prefs}>
      <AppShell name={firstName}>{children}</AppShell>
    </PrefsProvider>
  );
}
