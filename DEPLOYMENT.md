# Jera App Deployment Guide

This guide prepares the app for Vercel or Netlify. It does not require expert developer knowledge, and it does not expose private secrets.

## Before You Deploy

Make sure these are already done:

1. Your Supabase project exists.
2. You ran the SQL from `supabase-schema.sql` in the Supabase SQL Editor.
3. Your own email is added to the `approved_emails` table.
4. Lera's email can be added later when you are ready.
5. The app builds locally:

```powershell
npm install
npm run build
```

## Environment Variables

The app needs two production environment variables:

```text
VITE_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR-PUBLISHABLE-OR-ANON-PUBLIC-KEY
```

For your current project ID, the Supabase URL format is:

```text
https://majlnokhjjtokghcnhqc.supabase.co
```

The anon key is safe to use in the frontend because Supabase Row Level Security protects the data. Do not use or publish a `service_role` key.

Local files such as `.env` and `.env.local` are ignored by Git, so they should not be pushed to GitHub.

## Vercel Deployment

1. Push the project to GitHub.
2. Go to [Vercel](https://vercel.com/).
3. Choose **Add New...** then **Project**.
4. Import the GitHub repository.
5. Use these settings:

```text
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

6. Open **Environment Variables**.
7. Add:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

8. Deploy.

This repo includes `vercel.json`, which rewrites all routes to `index.html`. That means pages like `/timeline`, `/daily-3`, and `/next-visit` still work after refresh.

## Netlify Deployment

1. Push the project to GitHub.
2. Go to [Netlify](https://www.netlify.com/).
3. Choose **Add new site** then **Import an existing project**.
4. Select the GitHub repository.
5. Use these settings:

```text
Build command: npm run build
Publish directory: dist
```

6. Open **Site configuration** then **Environment variables**.
7. Add:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

8. Deploy.

This repo includes both `netlify.toml` and `public/_redirects` so direct route refreshes work correctly.

## Testing The Deployed App

After deployment:

1. Open the deployed URL.
2. Confirm the sign-in screen appears.
3. Sign in with an email that exists in the Supabase `approved_emails` table.
4. Visit every page:

```text
/
/timeline
/notes
/countdowns
/next-visit
/weather
/daily-3
/album
/date-night
/map
/bucket-list
```

5. Refresh on a nested page such as `/timeline`. It should reload without a 404.
6. Add a test memory, note, bucket list item, or Daily 3 entry.
7. Refresh the page and confirm the item remains.
8. Open the deployed app in another browser or device, sign in, and confirm the same data appears.
9. Try signing in with an unapproved email. It should not allow access to the private app.

## Making Sure Only Approved Users Can Access It

Access is controlled by Supabase, not by Vercel or Netlify.

The important table is:

```text
approved_emails
```

Only emails in that table should be able to use the private app data. To add an approved user:

1. Open Supabase.
2. Go to **Table Editor**.
3. Open `approved_emails`.
4. Add a row with the email address.
5. Keep `active` set to `true`.

You can deploy with only your own email first. Add Lera's email later when you are ready to reveal the app.

## Photo Uploads

Photo uploads use the private Supabase Storage bucket named:

```text
photos
```

If uploads fail after deployment:

1. Confirm the SQL schema was run.
2. Confirm the `photos` bucket exists in Supabase Storage.
3. Confirm the storage policies from `supabase-schema.sql` exist.
4. Confirm you are signed in with an approved email.

## Installing As A PWA

The app is installable because it includes:

```text
public/manifest.webmanifest
public/sw.js
public/icon-192.png
public/icon-512.png
public/apple-touch-icon.png
```

On iPhone:

1. Open the deployed app in Safari.
2. Tap the share button.
3. Tap **Add to Home Screen**.
4. Confirm the name is **Jera App**.

On desktop Chrome or Edge:

1. Open the deployed app.
2. Look for the install icon in the address bar.
3. Choose **Install**.

## Common Problems

### The app shows a Supabase setup message

The production environment variables are missing or named incorrectly. They must start with `VITE_`:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

After adding them, redeploy the site.

### Refreshing `/timeline` or another page gives a 404

Make sure `vercel.json`, `netlify.toml`, or `public/_redirects` is included in the deployed repository. These files route all browser paths back to the React app.

### Login works but the app says the account is not approved

Add that exact email address to Supabase `approved_emails`, or check that `active` is `true`.

### Data does not save

Check these in order:

1. You are signed in.
2. Your email is approved.
3. The SQL schema was run.
4. Row Level Security policies exist.
5. The browser console does not show a Supabase error.

### Never expose this key

Do not add a Supabase `service_role` key to Vercel, Netlify, GitHub, or frontend code. The app only needs the public anon/publishable key.
