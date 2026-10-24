# Material Mail

A free, open-source email client for Gmail, redesigned with **Material You (Material Design 3)**. No ads, no clutter, just your mail.

Material Mail doesn't host any mail. You sign in with Google and it reads and organizes the Gmail account you already have.

> **Material Mail is in testing.** Google hasn't finished reviewing the app, so only approved testers can sign in. After pressing *Sign in with Google* you'll see a warning like *"Google hasn't verified this app"*. That is expected. **Don't press Back to safety if you want to use the app**: choose *Continue* (or *Advanced*, then *Go to Material Mail*), but only if you trust this project. If Google says *Access blocked*, your account isn't on the tester list yet; open an issue to ask for access (leave your email out of the public post). While in testing, Google signs you out after about 7 days.

## Features

- Sign in with Google (the only way in)
- **Compose, reply, reply all and forward** (plain text)
- **Every Gmail label:** Inbox, Starred, Important, Sent, Drafts, All Mail, Spam, Trash, the five inbox categories, and all of your own labels, with unread counts
- Search, read, star, archive, trash, mark unread
- **Sender logos:** Cash App, GitHub and other brands show their logo instead of a letter (fetched by Material Mail's server, so your browser never contacts a third party)
- **Multiple accounts:** link up to 5 Google accounts and switch between them from the avatar menu
- Material 3 color scheme generated from a single seed color
- **Customize page:** light, dark or system theme, a color picker with presets, and on/off switches for everything below
- **Wallpaper:** upload a picture and Material Mail picks matching colors from it, and offers other colors from the image
- **Widgets:** clock (analog or digital), date, weather, unread count, note, calendar, quick search and compose. Drag them anywhere on the Home page with *Rearrange*, or keep them in a column beside your mail
- **Panel transparency and blur** sliders (with a wallpaper) and smooth **animations** you can switch off (they also respect your device's reduced-motion setting)
- **Optional top bar:** greeting, time and date, weather and unread count across the top of the app
- Preferences and wallpaper are saved to your account (stored in Supabase), so they follow you to any device. Each linked account has its own look. The theme renders with no flash
- Privacy first: remote images in emails are blocked until you allow them, and message HTML is rendered in a sandbox with scripts disabled
- **Delete my data** button (Customize page): removes your profile, token, settings and wallpaper and revokes access in Google
- Google refresh tokens are encrypted (AES-256-GCM) before they are stored

**Planned:** threads, attachments, applying labels to messages, rich-text compose, drafts.

## Tech stack

Next.js (App Router) and TypeScript, Supabase (Postgres) for accounts and encrypted tokens, Gmail API, hosted on Render.

## Setup

### 1. Google OAuth

1. In [Google Cloud Console](https://console.cloud.google.com/), create a project and enable the **Gmail API**.
2. Configure the **OAuth consent screen**, then create an **OAuth client ID** of type *Web application*.
3. Add this authorized redirect URI for each environment:
   - `http://localhost:3000/api/auth/callback`
   - `https://YOUR-SERVICE.onrender.com/api/auth/callback`
4. While the app is in *Testing* mode, add your Google account under **Test users**.

> **Scopes:** Material Mail asks for `gmail.modify` (read and organize mail) and `gmail.send` (send mail). Add both under **Data Access** in the Google Auth Platform. If you sign in before adding `gmail.send`, everything works except sending. After adding it, sign out and back in once.

> **Heads up:** Material Mail requests the `gmail.modify` scope, which Google classifies as *restricted*. In Testing mode only listed test users (up to 100) can sign in. Opening Material Mail to everyone requires Google's app verification and a security assessment.

### 2. Supabase

Create a project, then run [`supabase/schema.sql`](supabase/schema.sql) in the SQL editor. (It is safe to run again after updating Material Mail; it only adds what's missing.) Copy the project URL and the **service role** key from *Project Settings > API*.

### 3. Environment variables

```bash
cp .env.example .env.local
# fill in the values; generate secrets with:
openssl rand -base64 32   # TOKEN_ENCRYPTION_KEY
openssl rand -base64 48   # SESSION_SECRET
```

### 4. Run locally

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

## Deploy to Render

The repo includes a [`render.yaml`](render.yaml) blueprint. Create a **Web Service** from this repo (or use the blueprint), then set `APP_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in the dashboard. `TOKEN_ENCRYPTION_KEY` and `SESSION_SECRET` are generated for you. Render redeploys on every push.

### 5. Keep the free Render service awake (optional)

Render's free plan sleeps a service after about 15 minutes without traffic, so the first visit afterwards is slow. [`.github/workflows/keep-alive.yml`](.github/workflows/keep-alive.yml) pings `/api/health` every 5 minutes from GitHub Actions (5 minutes is the fastest GitHub allows; for tighter timing use a free external pinger such as cron-job.org pointed at `/api/health`) to prevent that. It uses `https://mmail.onrender.com` by default; to point it elsewhere, add a repository variable named `SITE_URL` (Settings > Secrets and variables > Actions > Variables). Notes: GitHub can delay scheduled runs, so an occasional sleep can still happen; GitHub pauses scheduled workflows after 60 days without repository activity (re-enable them on the Actions tab); and Render's free plan has a monthly hour allowance shared by all your free services, which a service that never sleeps will use up quickly.

## Security notes

- The Supabase service role key and all tokens stay on the server. Nothing sensitive is sent to the browser.
- The session cookie is `HttpOnly`, `SameSite=Lax`, signed with HMAC-SHA256, and `Secure` in production.
- The `users` table has Row Level Security enabled with no policies, so the public anon key can't read it.
- Sign-in uses the authorization code flow with PKCE and a state check.
- Saved settings are validated field by field on the server before use, so a tampered value can't reach the page.
- Outgoing mail headers are stripped of line breaks (blocking header injection), and the send endpoint only accepts JSON requests.
- Wallpapers are re-encoded in the browser (removing photo metadata) and only real JPEGs are stored. Logo images are served as raster formats only, never SVG.
- Weather uses Open-Meteo, which needs no account. Only the coordinates of the city you pick are sent to it.

## Legal

The app ships a [Privacy Policy](src/app/privacy/page.tsx) (`/privacy`) and [Terms of Service](src/app/terms/page.tsx) (`/terms`). If you run your own copy, review them and replace the contact and repository links with yours.

## Contributing

Issues and pull requests are welcome.

## License

[MIT](LICENSE)
