"use client";

import type { CSSProperties, ReactNode } from "react";
import { usePrefs } from "./PrefsProvider";
import { TopBar } from "./TopBar";

/** Frame around every signed-in page: the wallpaper, the optional top bar, then the page. */
export function AppShell({ name, children }: { name: string; children: ReactNode }) {
  const { prefs } = usePrefs();
  const style = {
    "--panel-a": `${prefs.opacity}%`,
    "--panel-blur": `${prefs.blur}px`,
    ...(prefs.wallpaper ? { "--wallpaper": `url(/api/wallpaper?v=${prefs.wallpaper})` } : {}),
  } as CSSProperties;

  return (
    <div className={`shell${prefs.wallpaper ? " has-wallpaper" : ""}`} style={style}>
      {prefs.bar && <TopBar name={name} />}
      {children}
    </div>
  );
}
