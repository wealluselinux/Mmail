# Mmail

A free, open-source email client for Gmail, redesigned with **Material You (Material Design 3)**. No ads, no clutter, just your mail.

Mmail doesn't host any mail. You sign in with Google and it reads and organizes the Gmail account you already have.

## Features

- Sign in with Google (the only way in)
- Inbox, Starred, Sent, Drafts, Spam and Trash
- Search, read, star, archive, trash, mark unread
- Material 3 color scheme generated from a single seed color
- **Customize page:** light, dark or system theme, a color picker with presets, and on/off switches for everything below
- **Widgets** (Home page): Material You clock (analog or digital), date, weather, unread count and a note of your own
- **Optional top bar:** greeting, time and date, weather and unread count across the top of the app
- Settings sync across your devices (stored in Supabase) and the theme renders with no flash
- Privacy first: remote images in emails are blocked until you allow them, and message HTML is rendered in a sandbox with scripts disabled
- Google refresh tokens are encrypted (AES-256-GCM) before they are stored

**Planned:** compose and reply, threads, labels, attachments, more widgets.

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

> **Heads up:** Mmail requests the `gmail.modify` scope, which Google classifies as *restricted*. In Testing mode only listed test users (up to 100) can sign in. Opening Mmail to everyone requires Google's app verification and a security assessment.

### 2. Supabase

Create a project, then run [`supabase/schema.sql`](supabase/schema.sql) in the SQL editor. (It is safe to run again after updating Mmail; it only adds what's missing.) Copy the project URL and the **service role** key from *Project Settings > API*.

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

## Security notes

- The Supabase service role key and all tokens stay on the server. Nothing sensitive is sent to the browser.
- The session cookie is `HttpOnly`, `SameSite=Lax`, signed with HMAC-SHA256, and `Secure` in production.
- The `users` table has Row Level Security enabled with no policies, so the public anon key can't read it.
- Sign-in uses the authorization code flow with PKCE and a state check.
- Saved settings are validated field by field on the server before use, so a tampered value can't reach the page.
- Weather uses Open-Meteo, which needs no account. Only the coordinates of the city you pick are sent to it.

## Contributing

Issues and pull requests are welcome.

## License

[MIT](LICENSE)
