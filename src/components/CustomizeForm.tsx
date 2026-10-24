"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { extractPalette, prepareWallpaper } from "@/lib/palette";
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

function WallpaperSection() {
  const { prefs, update } = usePrefs();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [palette, setPalette] = useState<string[]>([]);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return setMessage("Please choose an image file.");

    setBusy(true);
    setMessage(null);
    let prepared: Awaited<ReturnType<typeof prepareWallpaper>>;
    try {
      prepared = await prepareWallpaper(file);
    } catch {
      setBusy(false);
      return setMessage("Couldn't read that image. Try a JPG, PNG or WebP.");
    }

    try {
      const res = await fetch("/api/wallpaper", {
        method: "PUT",
        headers: { "Content-Type": "image/jpeg" },
        body: prepared.blob,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMessage(
          data.error === "storage_unavailable"
            ? "Wallpapers need the latest supabase/schema.sql to be run in Supabase first."
            : "Couldn't save that image. Please try again.",
        );
        return;
      }
      const colors = extractPalette(prepared.canvas);
      setPalette(colors);
      // The first color is the best match, so use it right away. The others are one tap away.
      update({ wallpaper: Date.now(), ...(colors[0] ? { seed: colors[0] } : {}) });
    } catch {
      setMessage("Couldn't reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function matchColors() {
    setBusy(true);
    setMessage(null);
    try {
      const img = new Image();
      img.src = `/api/wallpaper?v=${prefs.wallpaper}`;
      await img.decode();
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext("2d")?.drawImage(img, 0, 0);
      const colors = extractPalette(canvas);
      setPalette(colors);
      if (colors[0]) update({ seed: colors[0] });
    } catch {
      setMessage("Couldn't read the wallpaper. Try uploading it again.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setMessage(null);
    try {
      await fetch("/api/wallpaper", { method: "DELETE" });
      setPalette([]);
      update({ wallpaper: 0 });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card">
      <h2>Wallpaper</h2>
      <p>
        Put a picture behind Material Mail. It picks matching colors from the image, so everything
        else follows its mood.
      </p>

      {prefs.wallpaper > 0 && (
        <div
          className="wp-preview"
          style={{ backgroundImage: `url(/api/wallpaper?v=${prefs.wallpaper})` }}
          role="img"
          aria-label="Your wallpaper"
        />
      )}

      <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
      <div className="row-inline" style={{ alignItems: "center" }}>
        <button
          className="btn btn-tonal"
          type="button"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
        >
          <Icon name="image" size={20} />
          {busy ? "Working…" : prefs.wallpaper > 0 ? "Change wallpaper" : "Choose a wallpaper"}
        </button>
        {prefs.wallpaper > 0 && (
          <>
            <button className="btn btn-text" type="button" disabled={busy} onClick={matchColors}>
              Match colors to wallpaper
            </button>
            <button className="btn btn-text" type="button" disabled={busy} onClick={remove}>
              Remove
            </button>
          </>
        )}
      </div>
      {message && (
        <p role="alert" style={{ margin: "12px 0 0", fontSize: 13, color: "var(--md-error)" }}>
          {message}
        </p>
      )}

      {palette.length > 0 && (
        <>
          <span className="field-label">Colors from your wallpaper</span>
          <div className="swatches">
            {palette.map((c) => (
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
        </>
      )}
      <p style={{ margin: "14px 0 0", fontSize: 12 }}>
        Wallpapers are resized, stripped of photo details like location, and saved to your
        account.
      </p>
    </section>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  unit,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  disabled?: boolean;
  onChange: (v: number) => void;
}) {
  return (
    <label className="slider-row">
      <span className="slider-top">
        <strong>{label}</strong>
        <output>
          {value}
          {unit}
        </output>
      </span>
      <input
        type="range"
        className="range"
        min={min}
        max={max}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

function PanelsSection() {
  const { prefs, update } = usePrefs();
  const has = prefs.wallpaper > 0;
  return (
    <section className="card">
      <h2>Panels</h2>
      <p>
        Make your inbox, folders and settings cards see-through so your wallpaper shows behind
        them.{!has && " Add a wallpaper above to use these."}
      </p>
      <Slider
        label="Transparency"
        value={100 - prefs.opacity}
        min={0}
        max={75}
        unit="%"
        disabled={!has}
        onChange={(v) => update({ opacity: 100 - v })}
      />
      <Slider
        label="Background blur"
        value={prefs.blur}
        min={0}
        max={40}
        unit="px"
        disabled={!has}
        onChange={(blur) => update({ blur })}
      />
      <Switch
        label="Animations"
        hint="Smooth motion when lists, widgets and dialogs appear. Always off if your device asks for reduced motion."
        checked={prefs.motion}
        onChange={(motion) => update({ motion })}
      />
    </section>
  );
}

function DeleteAccount() {
  const [step, setStep] = useState<"idle" | "confirm" | "working">("idle");
  const [error, setError] = useState("");

  async function run() {
    setStep("working");
    setError("");
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "DELETE" }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json().catch(() => ({}));
      window.location.assign(data.empty ? "/" : "/mail");
    } catch {
      setError("Couldn't delete your data. Please try again.");
      setStep("confirm");
    }
  }

  return (
    <section className="card danger-card">
      <h2>Delete my data</h2>
      <p>
        Permanently deletes this account&rsquo;s saved data from Material Mail: your profile, sign-in
        token, settings and wallpaper. It also revokes Material Mail&rsquo;s access in Google. Your
        emails are not touched, because they stay in Gmail.
      </p>
      {error && (
        <p className="login-error" role="alert">
          {error}
        </p>
      )}
      {step === "idle" ? (
        <button className="btn btn-danger" onClick={() => setStep("confirm")}>
          Delete my data
        </button>
      ) : (
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button className="btn btn-danger" disabled={step === "working"} onClick={run}>
            {step === "working" ? "Deleting…" : "Yes, delete everything"}
          </button>
          <button className="btn btn-text" disabled={step === "working"} onClick={() => setStep("idle")}>
            Cancel
          </button>
        </div>
      )}
    </section>
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
          <p>Material Mail builds its whole color palette from one color, the way Material You does.</p>

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

        <WallpaperSection />

        <PanelsSection />

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
          <p>Turned-on widgets appear on the Home page in the sidebar. Each account has its own settings.</p>

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

          <Switch
            label="Calendar"
            hint="A month view with today highlighted"
            checked={prefs.widgets.calendar}
            onChange={(v) => setWidget("calendar", v)}
          />
          <Switch
            label="Quick search"
            hint="Search all your mail from the Home page"
            checked={prefs.widgets.search}
            onChange={(v) => setWidget("search", v)}
          />
          <Switch
            label="Compose"
            hint="A one-tap button to write a new message"
            checked={prefs.widgets.compose}
            onChange={(v) => setWidget("compose", v)}
          />
        </section>

        <section className="card">
          <h2>Widgets while reading mail</h2>
          <p>
            Keep your widgets visible in a column beside your messages. It appears on wide
            screens. On Home, use Rearrange to drag widgets wherever you like.
          </p>
          <Switch
            label="Show widgets beside my mail"
            checked={prefs.dock}
            onChange={(dock) => update({ dock })}
          />
        </section>

        <DeleteAccount />

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
