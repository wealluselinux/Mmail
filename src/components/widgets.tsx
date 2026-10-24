"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useInboxStats, useNow, useWeather } from "@/lib/hooks";
import { enabledKeys, orderedKeys, resolveLayout, sizeOf } from "@/lib/layout";
import type { Prefs, WidgetKey, WidgetPosition } from "@/lib/prefs";
import { Icon } from "./Icon";

/* ---------- shapes ---------- */

/** A scalloped "cookie" outline like the Material You clock widgets. */
function cookiePath(lobes: number, radius: number, amplitude: number): string {
  const steps = 240;
  let d = "";
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    const r = radius + amplitude * Math.cos(lobes * t);
    const x = 50 + r * Math.cos(t);
    const y = 50 + r * Math.sin(t);
    d += `${i === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
  }
  return d + "Z";
}

/* ---------- clock ---------- */

export function ClockWidget({ style }: { style: Prefs["clockStyle"] }) {
  const now = useNow();
  const shape = useMemo(() => cookiePath(12, 43, 3.6), []);

  if (style === "digital") {
    const parts = now
      ? now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }).split(" ")
      : ["--:--", ""];
    return (
      <div className="widget w-clock-digital" role="timer" aria-label="Current time">
        <span className="w-clock-time">{parts[0]}</span>
        {parts[1] && <span className="w-clock-ampm">{parts[1]}</span>}
      </div>
    );
  }

  const h = now ? now.getHours() % 12 : 10;
  const m = now ? now.getMinutes() : 10;
  const s = now ? now.getSeconds() : 0;
  const hourAngle = (h + m / 60) * 30;
  const minuteAngle = (m + s / 60) * 6;

  return (
    <div className="widget w-clock" role="img" aria-label={now ? now.toLocaleTimeString() : "Clock"}>
      <svg viewBox="0 0 100 100" width="100%" height="100%">
        <path d={shape} fill="var(--md-primary-container)" />
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i * 30 * Math.PI) / 180;
          return (
            <circle
              key={i}
              cx={50 + 33 * Math.sin(a)}
              cy={50 - 33 * Math.cos(a)}
              r={i % 3 === 0 ? 1.8 : 1.1}
              fill="var(--md-on-primary-container)"
              opacity={i % 3 === 0 ? 0.7 : 0.35}
            />
          );
        })}
        <line
          x1="50" y1="50" x2="50" y2="31"
          stroke="var(--md-on-primary-container)" strokeWidth="5.5" strokeLinecap="round"
          transform={`rotate(${hourAngle} 50 50)`}
        />
        <line
          x1="50" y1="50" x2="50" y2="20"
          stroke="var(--md-primary)" strokeWidth="3.6" strokeLinecap="round"
          transform={`rotate(${minuteAngle} 50 50)`}
        />
        <circle cx="50" cy="50" r="3.2" fill="var(--md-tertiary)" />
      </svg>
    </div>
  );
}

/* ---------- date ---------- */

export function DateWidget() {
  const now = useNow();
  return (
    <div className="widget w-date" aria-label="Today's date">
      <span className="w-date-day">{now ? now.toLocaleDateString([], { weekday: "short" }) : "—"}</span>
      <span className="w-date-num">{now ? now.getDate() : "--"}</span>
      <span className="w-date-month">{now ? now.toLocaleDateString([], { month: "long" }) : ""}</span>
    </div>
  );
}

/* ---------- weather ---------- */

type Kind = "clear" | "partly" | "cloud" | "fog" | "rain" | "snow" | "storm";

export function describeWeather(code: number): { label: string; kind: Kind } {
  if (code === 0) return { label: "Clear", kind: "clear" };
  if (code <= 2) return { label: "Partly cloudy", kind: "partly" };
  if (code === 3) return { label: "Overcast", kind: "cloud" };
  if (code === 45 || code === 48) return { label: "Fog", kind: "fog" };
  if (code >= 51 && code <= 57) return { label: "Drizzle", kind: "rain" };
  if (code >= 61 && code <= 67) return { label: "Rain", kind: "rain" };
  if (code >= 71 && code <= 77) return { label: "Snow", kind: "snow" };
  if (code >= 80 && code <= 82) return { label: "Showers", kind: "rain" };
  if (code === 85 || code === 86) return { label: "Snow showers", kind: "snow" };
  if (code >= 95) return { label: "Thunderstorm", kind: "storm" };
  return { label: "Unknown", kind: "cloud" };
}

const CLOUD = "M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z";

export function WeatherIcon({ kind, isDay = true, size = 28 }: { kind: Kind; isDay?: boolean; size?: number }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
    >
      {kind === "clear" &&
        (isDay ? (
          <>
            <circle cx="12" cy="12" r="4" />
            {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
              <line key={a} x1="12" y1="2.5" x2="12" y2="5" transform={`rotate(${a} 12 12)`} />
            ))}
          </>
        ) : (
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        ))}
      {kind === "partly" && (
        <>
          <circle cx="8" cy="8" r="3" />
          <line x1="8" y1="2" x2="8" y2="3" />
          <line x1="2" y1="8" x2="3" y2="8" />
          <line x1="3.8" y1="3.8" x2="4.6" y2="4.6" />
          <line x1="12.2" y1="3.8" x2="11.4" y2="4.6" />
          <path d="M19 19H11a4 4 0 1 1 .6-7.96A5 5 0 0 1 19 13a3 3 0 0 1 0 6z" />
        </>
      )}
      {kind === "cloud" && <path d={CLOUD} />}
      {kind === "fog" && (
        <>
          <line x1="3" y1="8" x2="21" y2="8" />
          <line x1="5" y1="12" x2="19" y2="12" />
          <line x1="3" y1="16" x2="21" y2="16" />
          <line x1="7" y1="20" x2="17" y2="20" />
        </>
      )}
      {kind === "rain" && (
        <>
          <path d="M18 9h-1.26A8 8 0 1 0 9 17h9a4 4 0 0 0 0-8z" />
          <line x1="8" y1="19" x2="7" y2="22" />
          <line x1="12" y1="19" x2="11" y2="22" />
          <line x1="16" y1="19" x2="15" y2="22" />
        </>
      )}
      {kind === "snow" && (
        <>
          <path d="M18 9h-1.26A8 8 0 1 0 9 17h9a4 4 0 0 0 0-8z" />
          <circle cx="8" cy="20.5" r="0.6" />
          <circle cx="12" cy="21.5" r="0.6" />
          <circle cx="16" cy="20.5" r="0.6" />
        </>
      )}
      {kind === "storm" && (
        <>
          <path d="M18 9h-1.26A8 8 0 1 0 9 17h2" />
          <path d="M18 9a4 4 0 0 1 0 8h-1" />
          <polyline points="13 12 10 17 14 17 11 22" />
        </>
      )}
    </svg>
  );
}

export function WeatherWidget({ prefs }: { prefs: Prefs }) {
  const weather = useWeather(prefs.weather, prefs.units);

  if (!prefs.weather) {
    return (
      <div className="widget w-weather w-empty">
        <WeatherIcon kind="partly" size={30} />
        <p>Pick a city to see the weather.</p>
        <Link href="/customize" className="chip">
          Open Customize
        </Link>
      </div>
    );
  }

  const info = weather ? describeWeather(weather.code) : null;
  const unit = prefs.units === "f" ? "°F" : "°C";
  return (
    <div className="widget w-weather">
      <div className="w-weather-top">
        <div className="w-weather-cond">
          <WeatherIcon kind={info?.kind ?? "cloud"} isDay={weather?.isDay ?? true} />
          <span>{info?.label ?? "Loading…"}</span>
        </div>
        <span className="w-weather-temp">{weather ? `${Math.round(weather.temp)}°` : "--°"}</span>
      </div>
      <div className="w-weather-bottom">
        <span className="chip chip-soft">{weather ? `${Math.round(weather.humidity)}% humidity` : "—"}</span>
        <span className="chip chip-soft">
          {weather ? `Feels ${Math.round(weather.feels)}${unit}` : "—"}
        </span>
        <span className="chip chip-solid">{prefs.weather.name}</span>
      </div>
    </div>
  );
}

/* ---------- unread, note, calendar, search, compose ---------- */

/** Things widgets can ask the mail screen to do. All optional. */
export type WidgetActions = {
  openInbox?: () => void;
  search?: (query: string) => void;
  compose?: () => void;
};

export function UnreadWidget({ onOpen }: { onOpen?: () => void }) {
  const stats = useInboxStats();
  const body = (
    <>
      <span className="w-pill-icon">
        <Icon name="mail" size={22} />
      </span>
      <span className="w-unread-count">{stats ? stats.unread : "–"}</span>
      <span className="w-unread-label">unread in inbox</span>
    </>
  );
  return onOpen ? (
    <button className="widget w-unread" onClick={onOpen}>
      {body}
    </button>
  ) : (
    <Link className="widget w-unread" href="/mail">
      {body}
    </Link>
  );
}

export function NoteWidget({ text }: { text: string }) {
  return (
    <div className="widget w-note">
      <span className="w-note-mark">“</span>
      <span>{text || "Add a note in Customize"}</span>
    </div>
  );
}

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

export function CalendarWidget() {
  const now = useNow();
  const [offset, setOffset] = useState(0);

  const base = now ?? new Date(2026, 0, 1);
  const view = new Date(base.getFullYear(), base.getMonth() + offset, 1);
  const first = view.getDay();
  const days = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
  const isThisMonth = offset === 0 && !!now;
  const today = now?.getDate();

  const cells: (number | null)[] = [
    ...Array.from({ length: first }, () => null),
    ...Array.from({ length: days }, (_, i) => i + 1),
  ];

  return (
    <div className="widget w-calendar">
      <div className="w-cal-head">
        <button className="icon-btn" aria-label="Previous month" onClick={() => setOffset((o) => o - 1)}>
          <Icon name="chevronLeft" />
        </button>
        <button
          className="w-cal-title"
          title="Back to this month"
          onClick={() => setOffset(0)}
        >
          {view.toLocaleDateString([], { month: "long", year: "numeric" })}
        </button>
        <button className="icon-btn" aria-label="Next month" onClick={() => setOffset((o) => o + 1)}>
          <Icon name="chevronRight" />
        </button>
      </div>
      <div className="w-cal-grid" role="grid">
        {WEEKDAYS.map((d, i) => (
          <span key={i} className="w-cal-dow">
            {d}
          </span>
        ))}
        {cells.map((d, i) => (
          <span
            key={i}
            className={`w-cal-day${isThisMonth && d === today ? " today" : ""}`}
            aria-current={isThisMonth && d === today ? "date" : undefined}
          >
            {d ?? ""}
          </span>
        ))}
      </div>
    </div>
  );
}

export function SearchWidget({ onSearch }: { onSearch?: (q: string) => void }) {
  const [q, setQ] = useState("");
  return (
    <form
      className="widget w-search"
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        if (q.trim()) onSearch?.(q.trim());
      }}
    >
      <Icon name="search" size={22} />
      <input
        type="search"
        placeholder="Search all mail"
        aria-label="Search all mail"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
    </form>
  );
}

export function ComposeWidget({ onCompose }: { onCompose?: () => void }) {
  return (
    <button className="widget w-compose" onClick={onCompose}>
      <Icon name="edit" size={22} />
      Write a message
    </button>
  );
}

/* ---------- placing widgets ---------- */

export function renderWidget(key: WidgetKey, prefs: Prefs, actions: WidgetActions) {
  switch (key) {
    case "clock":
      return <ClockWidget style={prefs.clockStyle} />;
    case "date":
      return <DateWidget />;
    case "weather":
      return <WeatherWidget prefs={prefs} />;
    case "unread":
      return <UnreadWidget onOpen={actions.openInbox} />;
    case "note":
      return <NoteWidget text={prefs.note} />;
    case "calendar":
      return <CalendarWidget />;
    case "search":
      return <SearchWidget onSearch={actions.search} />;
    case "compose":
      return <ComposeWidget onCompose={actions.compose} />;
  }
}

function EmptyBoard() {
  return (
    <div className="empty">
      <div>
        <p>No widgets are turned on.</p>
        <Link href="/customize" className="btn btn-tonal">
          Open Customize
        </Link>
      </div>
    </div>
  );
}

const snap = (n: number) => Math.round(n / 10) * 10;
const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);

/**
 * The Home board. Widgets sit wherever you put them. Switch on "Rearrange" to
 * drag them around; they snap to a 10px grid and the spots are saved to your account.
 */
export function WidgetCanvas({
  prefs,
  actions,
  editing,
  onMove,
}: {
  prefs: Prefs;
  actions: WidgetActions;
  editing: boolean;
  onMove: (key: WidgetKey, pos: WidgetPosition) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [drag, setDrag] = useState<{ key: WidgetKey; x: number; y: number } | null>(null);
  const grab = useRef<{ key: WidgetKey; dx: number; dy: number } | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setWidth(el.clientWidth));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const keys = enabledKeys(prefs);
  if (keys.length === 0) return <EmptyBoard />;

  const positions = resolveLayout(prefs, width);
  const bottom = keys.reduce((max, k) => {
    const p = drag?.key === k ? drag : positions[k]!;
    return Math.max(max, p.y + sizeOf(k, prefs).h);
  }, 0);

  return (
    <div
      ref={ref}
      className={`canvas${editing ? " editing" : ""}`}
      style={{ minHeight: bottom + 48 }}
    >
      {keys.map((key) => {
        const pos = drag?.key === key ? drag : positions[key]!;
        const { w } = sizeOf(key, prefs);
        const maxX = Math.max(0, width - w - 8);
        return (
          <div
            key={key}
            className={`cw${drag?.key === key ? " dragging" : ""}`}
            style={{ left: pos.x, top: pos.y }}
            onPointerDown={(e) => {
              if (!editing) return;
              e.currentTarget.setPointerCapture(e.pointerId);
              grab.current = { key, dx: e.clientX - pos.x, dy: e.clientY - pos.y };
              setDrag({ key, x: pos.x, y: pos.y });
            }}
            onPointerMove={(e) => {
              const g = grab.current;
              if (!g || g.key !== key) return;
              setDrag({
                key,
                x: clamp(e.clientX - g.dx, 0, maxX),
                y: clamp(e.clientY - g.dy, 0, 4000),
              });
            }}
            onPointerUp={() => {
              if (grab.current && drag) onMove(key, { x: snap(drag.x), y: snap(drag.y) });
              grab.current = null;
              setDrag(null);
            }}
            onPointerCancel={() => {
              grab.current = null;
              setDrag(null);
            }}
          >
            {renderWidget(key, prefs, actions)}
          </div>
        );
      })}
    </div>
  );
}

/** The enabled widgets stacked in a column, shown beside your mail when the dock is on. */
export function WidgetStack({ prefs, actions }: { prefs: Prefs; actions: WidgetActions }) {
  const keys = orderedKeys(prefs);
  if (keys.length === 0) return <EmptyBoard />;
  return (
    <div className="stack">
      {keys.map((key) => (
        <div key={key} className="stack-item">
          {renderWidget(key, prefs, actions)}
        </div>
      ))}
    </div>
  );
}
