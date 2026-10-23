"use client";

import Link from "next/link";
import { useInboxStats, useNow, useWeather } from "@/lib/hooks";
import { Icon } from "./Icon";
import { usePrefs } from "./PrefsProvider";
import { WeatherIcon, describeWeather } from "./widgets";

function greeting(hour: number): string {
  if (hour < 5) return "Good night";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/** Optional status bar across the very top of the app, inspired by desktop shell bars. */
export function TopBar({ name }: { name: string }) {
  const { prefs } = usePrefs();
  const now = useNow();
  const weather = useWeather(prefs.weather, prefs.units);
  const stats = useInboxStats();

  return (
    <div className="topbar-strip" role="status">
      <div className="strip-left">{now ? `${greeting(now.getHours())}, ${name}` : " "}</div>

      <div className="strip-center">
        {now && (
          <>
            <span className="strip-time">
              {now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
            </span>
            <span className="strip-dot">•</span>
            <span>
              {now.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}
            </span>
          </>
        )}
      </div>

      <div className="strip-right">
        {prefs.weather && weather && (
          <span className="strip-item" title={prefs.weather.name}>
            <WeatherIcon
              kind={describeWeather(weather.code).kind}
              isDay={weather.isDay}
              size={18}
            />
            {Math.round(weather.temp)}°{prefs.units.toUpperCase()}
          </span>
        )}
        {stats && (
          <Link href="/mail" className="strip-badge" title="Unread in inbox">
            <Icon name="mail" size={14} />
            {stats.unread}
          </Link>
        )}
        <Link href="/customize" className="strip-icon" title="Customize" aria-label="Customize">
          <Icon name="settings" size={18} />
        </Link>
      </div>
    </div>
  );
}
