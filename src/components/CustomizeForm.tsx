"use client";

import Link from "next/link";
import { useState } from "react";
import type { Prefs, WidgetKey } from "@/lib/prefs";
import { Icon } from "./Icon";
import { usePrefs, type SaveStatus } from "./PrefsProvider";

const PRESETS = [
  "#7c5cbf", "#4a6fd1", "#00897b", "#5b8c3a", "#c49000", "#d9642b", "#c2477b", "#6b7280",
];

const STATUS_TEXT: Record<SaveStatus, string> = {
  idle: "",
  saving: "Saving…",
  saved: "Saved",
  "device-only":
    "Saved on this device. Run the latest supabase/schema.sql to sync across devices.",
  error: "Couldn't save. Please try again.",
};

type Place = { name: string; admin1?: string; country?: string; latitude: number; longitude: number };

function Switch({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="switch-row">
      <span>
        <strong>{label}</strong>
        {hint && <small>{hint}</small>}
      </span>
      <input
        type="checkbox"
        role="switch"
        className="switch"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
        >
          {value === o.value && <Icon name="check" size={16} />}
          {o.label}
        </button>
      ))}
    </div>
  );
}

function CityPicker() {
  const { prefs, update } = usePrefs();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Place[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=5&language=en&format=json`,
      );
      const json = await res.json();
      const found: Place[] = json.results ?? [];
      setResults(found);
      if (found.length === 0) setMessage("No places found. Try a different spelling.");
    } catch {
      setMessage("Couldn't search right now. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function choose(p: Place) {
    const name = [p.name, p.admin1].filter(Boolean).join(", ");
    update({ weather: { name, lat: p.latitude, lon: p.longitude } });
    setResults([]);
    setQuery("");
  }

  function useMyLocation() {
    if (!navigator.geolocation) return setMessage("Your browser can't share its location.");
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        update({
          weather: {
            name: "My location",
            lat: Math.round(pos.coords.latitude * 100) / 100,
            lon: Math.round(pos.coords.longitude * 100) / 100,
          },
        }),
      () => setMessage("Location permission was denied."),
    );
  }

  return (
    <div className="sub">
      <span className="field-label" style={{ marginTop: 0 }}>
        Location: <strong>{prefs.weather?.name ?? "not set"}</strong>
      </span>
      <form className="row-inline" onSubmit={search}>
        <input
          className="text-input"
          placeholder="Search for a city"
          aria-label="Search for a city"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button className="btn btn-tonal" type="submit" disabled={busy} style={{ height: 44 }}>
          {busy ? "Searching…" : "Search"}
        </button>
        <button className="btn btn-text" type="button" onClick={useMyLocation} style={{ height: 44 }}>
          Use my location
        </button>
      </form>
      {message && <p style={{ margin: "10px 0 0", fontSize: 13 }}>{message}</p>}
      {results.length > 0 && (
        <div className="result-list">
          {results.map((p) => (
            <button
              key={`${p.latitude},${p.longitude}`}
              className="chip"
              onClick={() => choose(p)}
              type="button"
            >
              {[p.name, p.admin1, p.country].filter(Boolean).join(", ")}
            </button>
          ))}
        </div>
      )}
      <span className="field-label">Temperature</span>
      <Segmented
        label="Temperature units"
        value={prefs.units}
        onChange={(units) => update({ units })}
        options={[
          { value: "f", label: "°F" },
          { value: "c", label: "°C" },
        ]}
      />
      <p style={{ margin: "12px 0 0", fontSize: 12, color: "var(--md-on-surface-variant)" }}>
        Weather comes from Open-Meteo. Only the coordinates of this location are sent.
      </p>
    </div>
  );
}

export function CustomizeForm() {
  const { prefs, status, update, reset } = usePrefs();
  const [hexDraft, setHexDraft] = useState<string | null>(null);

  const setWidget = (key: WidgetKey, on: boolean) =>
    update((p: Prefs) => ({ widgets: { ...p.widgets, [key]: on } }));

  return (
    <div className="settings-page">
      <div className="settings-inner">
        <div className="settings-head">
          <Link href="/mail" className="icon-btn" aria-label="Back to mail" title="Back to mail">
            <Icon name="back" />
          </Link>
          <h1>Customize</h1>
          <span className="save-status" role="status">
            {STATUS_TEXT[status]}
          </span>
        </div>

        <section className="card">
          <h2>Appearance</h2>
          <p>Mmail builds its whole color palette from one color, the way Material You does.</p>

          <span className="field-label" style={{ marginTop: 0 }}>
            Theme
          </span>
          <Segmented
            label="Theme mode"
            value={prefs.mode}
            onChange={(mode) => update({ mode })}
            options={[
              { value: "system", label: "System" },
              { value: "light", label: "Light" },
              { value: "dark", label: "Dark" },
            ]}
          />

          <span className="field-label">Accent color</span>
          <div className="swatches">
            {PRESETS.map((c) => (
              <button
                key={c}
                type="button"
                className="swatch"
                style={{ background: c }}
                aria-label={`Use color ${c}`}
                aria-pressed={prefs.seed === c}
                onClick={() => update({ seed: c })}
              >
                {prefs.seed === c && <Icon name="check" size={20} />}
              </button>
            ))}
          </div>
          <div className="color-custom">
            <input
              type="color"
              aria-label="Pick a custom color"
              value={prefs.seed}
              onChange={(e) => update({ seed: e.target.value })}
            />
            <input
              className="text-input"
              aria-label="Hex color"
              maxLength={7}
              style={{ width: 120 }}
              value={hexDraft ?? prefs.seed}
              onChange={(e) => {
                const v = e.target.value;
                setHexDraft(v);
                if (/^#[0-9a-f]{6}$/i.test(v)) update({ seed: v });
              }}
              onBlur={() => setHexDraft(null)}
            />
          </div>
        </section>

        <section className="card">
          <h2>Top bar</h2>
          <p>A slim bar across the top with a greeting, the time, weather and your unread count.</p>
          <Switch
            label="Show the top bar"
            checked={prefs.bar}
            onChange={(bar) => update({ bar })}
          />
        </section>

        <section className="card">
          <h2>Widgets</h2>
          <p>Turned-on widgets appear on the Home page in the sidebar.</p>

          <Switch
            label="Clock"
            hint="A Material You clock"
            checked={prefs.widgets.clock}
            onChange={(v) => setWidget("clock", v)}
          />
          {prefs.widgets.clock && (
            <div className="sub">
              <Segmented
                label="Clock style"
                value={prefs.clockStyle}
                onChange={(clockStyle) => update({ clockStyle })}
                options={[
                  { value: "analog", label: "Analog" },
                  { value: "digital", label: "Digital" },
                ]}
              />
            </div>
          )}

          <Switch
            label="Date"
            hint="Today's date in a round tile"
            checked={prefs.widgets.date}
            onChange={(v) => setWidget("date", v)}
          />

          <Switch
            label="Weather"
            hint="Current conditions for a city you choose"
            checked={prefs.widgets.weather}
            onChange={(v) => setWidget("weather", v)}
          />
          {(prefs.widgets.weather || prefs.bar) && <CityPicker />}

          <Switch
            label="Unread mail"
            hint="How many unread messages are in your inbox"
            checked={prefs.widgets.unread}
            onChange={(v) => setWidget("unread", v)}
          />

          <Switch
            label="Note"
            hint="A short message of your own"
            checked={prefs.widgets.note}
            onChange={(v) => setWidget("note", v)}
          />
          {prefs.widgets.note && (
            <div className="sub">
              <input
                className="text-input"
                style={{ width: "100%" }}
                aria-label="Note text"
                placeholder="Write something short"
                maxLength={80}
                value={prefs.note}
                onChange={(e) => update({ note: e.target.value })}
              />
            </div>
          )}
        </section>

        <div style={{ marginTop: 20, display: "flex", gap: 12 }}>
          <Link href="/mail" className="btn btn-filled">
            Done
          </Link>
          <button className="btn btn-text" onClick={reset}>
            Reset to defaults
          </button>
        </div>
      </div>
    </div>
  );
}
