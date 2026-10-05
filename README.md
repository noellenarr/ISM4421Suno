# Suno Studio 🎵

A one-page music maker built on the [Suno API](https://docs.sunoapi.org).

## Features
- **Simple mode** – describe a song, get music (with idea shortcuts)
- **Custom mode** – title, style, your own lyrics, styles to avoid, vocal gender, length, style strength, weirdness
- **AI lyrics writer** – fills in lyrics for you
- Instrumental toggle and model picker (V6, V6 Wild, V6 Mini)
- Live progress, audio player, cover art, MP3 download, lyrics view
- Credit balance
- **Email login** (sign up, log in, forgot password, log out) with Supabase
- Each user's songs are saved in the database and show up on any device
- Only logged-in users can make songs, so strangers can't use your credits

## Deploy on Netlify
1. In Netlify: **Add new site → Import from Git** and pick this repo (branch `main`).
   Build settings come from `netlify.toml` (no build command needed).
2. Go to **Site configuration → Environment variables** and add:
   - Key: `SUNO_API_KEY`
   - Value: your Suno API key
3. Redeploy. Done.

The key stays on the server (inside a Netlify Function), so visitors can't see it.

## Login setup (Supabase)
The database tables are already created (see `supabase/migrations/`). In the Supabase dashboard:
1. **Authentication → URL Configuration**
   - Site URL: your Netlify link (e.g. `https://deluxe-treacle-a2eb57.netlify.app`)
   - Redirect URLs: add the same link, plus `http://localhost:8888` for local testing
2. **Authentication → Sign In / Providers → Email**: keep it on. "Confirm email" on = users must click a link before logging in.
3. (Recommended) **Authentication → Emails → SMTP Settings**: add your own email sender. Supabase's free built-in sender only sends a few emails per hour.

## Run locally
```bash
npm i -g netlify-cli
echo "SUNO_API_KEY=your_key_here" > .env
netlify dev
```

## Files
- `public/index.html` – the whole app (HTML, CSS, JS)
- `netlify/functions/suno.mjs` – safe proxy to the Suno API
- `netlify/functions/callback.mjs` – receives Suno callbacks (the app polls instead)
- `supabase/migrations/` – database tables and security rules
