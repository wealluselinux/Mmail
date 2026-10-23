"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import type { WeatherLocation } from "./prefs";

function subscribeToSeconds(onChange: () => void) {
  const id = setInterval(onChange, 1000);
  return () => clearInterval(id);
}

/**
 * The current time, ticking every second. Returns null on the server and during
 * hydration so clocks never cause a server/client mismatch.
 */
export function useNow(): Date | null {
  const seconds = useSyncExternalStore(
    subscribeToSeconds,
    () => Math.floor(Date.now() / 1000),
    () => 0,
  );
  return seconds ? new Date(seconds * 1000) : null;
}

export type InboxStats = { unread: number; total: number };

let statsCache: { at: number; promise: Promise<InboxStats | null> } | null = null;

function loadStats(): Promise<InboxStats | null> {
  if (statsCache && Date.now() - statsCache.at < 30_000) return statsCache.promise;
  const promise = fetch("/api/mail/stats")
    .then((r) => (r.ok ? (r.json() as Promise<InboxStats>) : null))
    .catch(() => null);
  statsCache = { at: Date.now(), promise };
  return promise;
}

/** Inbox counts, refreshed every minute. Shared between widgets so they make one request. */
export function useInboxStats(): InboxStats | null {
  const [stats, setStats] = useState<InboxStats | null>(null);
  useEffect(() => {
    let alive = true;
    const run = () => loadStats().then((s) => alive && s && setStats(s));
    run();
    const id = setInterval(run, 60_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);
  return stats;
}

export type Weather = {
  temp: number;
  feels: number;
  humidity: number;
  code: number;
  isDay: boolean;
};

/**
 * Current weather from Open-Meteo (free, no API key). The browser sends only the
 * coordinates of the city the user chose.
 */
export function useWeather(loc: WeatherLocation | null, units: "f" | "c"): Weather | null {
  const key = loc ? `${loc.lat},${loc.lon},${units}` : null;
  const [result, setResult] = useState<{ key: string; data: Weather } | null>(null);

  useEffect(() => {
    if (!loc || !key) return;
    let alive = true;
    const run = () => {
      const url =
        "https://api.open-meteo.com/v1/forecast" +
        `?latitude=${loc.lat}&longitude=${loc.lon}` +
        "&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,is_day" +
        `&temperature_unit=${units === "f" ? "fahrenheit" : "celsius"}`;
      fetch(url)
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => {
          if (!alive || !j?.current) return;
          setResult({
            key,
            data: {
              temp: j.current.temperature_2m,
              feels: j.current.apparent_temperature,
              humidity: j.current.relative_humidity_2m,
              code: j.current.weather_code,
              isDay: j.current.is_day === 1,
            },
          });
        })
        .catch(() => {});
    };
    run();
    const id = setInterval(run, 10 * 60_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [loc, key, units]);

  return result && result.key === key ? result.data : null;
}
