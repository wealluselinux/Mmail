"use client";

import type { ReactNode } from "react";
import { usePrefs } from "./PrefsProvider";
import { TopBar } from "./TopBar";

/** Frame around every signed-in page: the optional top bar, then the page itself. */
export function AppShell({ name, children }: { name: string; children: ReactNode }) {
  const { prefs } = usePrefs();
  return (
    <div className="shell">
      {prefs.bar && <TopBar name={name} />}
      {children}
    </div>
  );
}
