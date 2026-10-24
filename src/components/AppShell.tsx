"use client";

import type { CSSProperties, ReactNode } from "react";
import { usePrefs } from "./PrefsProvider";
import { TopBar } from "./TopBar";

/** Frame around every signed-in page: the wallpaper, the optional top bar, then the page. */
export function AppShell({ name, children }: { name: string; children: ReactNode }) {
  const { prefs } = usePrefs();
  const style = prefs.wallpaper
    ? ({ "--wallpaper": `url(/api/wallpaper?v=${prefs.wallpaper})` } as CSSProperties)
    : undefined;

  return (
    <div className={`shell${prefs.wallpaper ? " has-wallpaper" : ""}`} style={style}>
      {prefs.bar && <TopBar name={name} />}
      {children}
    </div>
  );
}
