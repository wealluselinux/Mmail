"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { DEFAULT_PREFS, sanitizePrefs, type Prefs } from "@/lib/prefs";
import { buildThemeCss } from "@/lib/theme";

export type SaveStatus = "idle" | "saving" | "saved" | "device-only" | "error";

type Ctx = {
  prefs: Prefs;
  status: SaveStatus;
  /** Applies a change instantly and saves it in the background. */
  update: (change: Partial<Prefs> | ((p: Prefs) => Partial<Prefs>)) => void;
  reset: () => void;
};

const PrefsContext = createContext<Ctx | null>(null);

export function usePrefs(): Ctx {
  const ctx = useContext(PrefsContext);
  if (!ctx) throw new Error("usePrefs must be used inside <PrefsProvider>");
  return ctx;
}

export function PrefsProvider({ initial, children }: { initial: Prefs; children: ReactNode }) {
  const [prefs, setPrefs] = useState<Prefs>(initial);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(prefs);

  // Re-theme the whole app live whenever the seed color or light/dark mode changes.
  useEffect(() => {
    const el = document.getElementById("mmail-theme");
    if (el) el.textContent = buildThemeCss(prefs.seed, prefs.mode);
  }, [prefs.seed, prefs.mode]);

  const save = useCallback((next: Prefs) => {
    latest.current = next;
    setStatus("saving");
    if (timer.current) clearTimeout(timer.current);
    // Debounce so dragging the color picker doesn't fire a request per pixel.
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(latest.current),
        });
        if (!res.ok) return setStatus("error");
        const data = await res.json();
        setStatus(data.synced ? "saved" : "device-only");
      } catch {
        setStatus("error");
      }
    }, 600);
  }, []);

  const update = useCallback<Ctx["update"]>(
    (change) => {
      const next = sanitizePrefs({
        ...latest.current,
        ...(typeof change === "function" ? change(latest.current) : change),
      });
      latest.current = next;
      setPrefs(next);
      save(next);
    },
    [save],
  );

  const reset = useCallback(() => {
    const next = sanitizePrefs(DEFAULT_PREFS);
    latest.current = next;
    setPrefs(next);
    save(next);
  }, [save]);

  const value = useMemo(() => ({ prefs, status, update, reset }), [prefs, status, update, reset]);
  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}
