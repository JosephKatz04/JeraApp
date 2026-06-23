# Supabase Setup Guide for Jera App

This guide walks you through setting up Supabase so Jera App saves privately, syncs across devices, and only works for two approved people.

You do not need to be an expert developer. Follow the steps in order.

## 1. Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com).
2. Sign in or create an account.
3. Click **New project**.
4. Choose an organization.
5. Enter a project name, for example `jera-app`.
6. Create a database password and save it somewhere private.
7. Pick a region close to you.
8. Click **Create new project**.

Wait for Supabase to finish creating the project before continuing.

## 2. Find Your Supabase URL and Anon Key

1. Open your Supabase project.
2. In the left sidebar, go to **Project Settings**.
3. Click **API**.
4. Copy these two values:
   - **Project URL**
   - **anon public key**

The anon key is safe to use in the frontend because database access is protected by Row Level Security policies.

## 3. Create the `.env.local` File

In the project folder, create a file named:

```text
.env.local
```

Add this:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
```

Replace the values with the URL and anon key from Supabase.

Do not commit `.env.local` to GitHub. It is for your local machine only.

## 4. Run the SQL Schema

The project includes a file named:

```text
supabase-schema.sql
```

Before running it, open that file and find this section:

```sql
insert into approved_emails (email)
values
  ('joey@example.com'),
  ('lera@example.com')
on conflict (email) do nothing;
```

Replace those emails with the two real emails that should be allowed into the app.

Example:

```sql
insert into approved_emails (email)
values
  ('your.email@example.com'),
  ('lera.email@example.com')
on conflict (email) do nothing;
```

Then:

1. Go to your Supabase project.
2. Open **SQL Editor**.
3. Click **New query**.
4. Paste the full contents of `supabase-schema.sql`.
5. Click **Run**.

This creates all app tables, privacy policies, triggers, and the photo storage bucket.

## 5. Row Level Security

Row Level Security, or RLS, is what keeps your app private.

The SQL script automatically:

- Enables RLS on all app tables.
- Allows only approved users to read app data.
- Allows only approved users to add, edit, or delete shared app data.
- Prevents random signed-in users from accessing your private data.
- Keeps photo storage private through Supabase Storage policies.

You do not need to manually create policies if the SQL script ran successfully.

## 6. Create the Two Approved Accounts

There are two ways to create accounts.

### Option A: Sign Up Through the App

1. Start the app locally.
2. Open the app in your browser.
3. Click **Sign up**.
4. Create an account with one of the approved emails.
5. Repeat for the second approved email.

If email confirmation is enabled in Supabase, check your inbox and confirm the account.

### Option B: Create Users in Supabase

1. In Supabase, go to **Authentication**.
2. Go to **Users**.
3. Click **Add user**.
4. Add the first approved email.
5. Add the second approved email.

The app checks the `profiles` table to decide who is approved. The SQL script creates profile rows automatically when users sign up.

If a user already exists but is not approved, go to **Table Editor** → `profiles`, find that user, and set:

```text
is_approved = true
```

Only do this for the two people who should use the app.

## 7. Set Up Supabase Storage for Photos

The SQL script creates a private bucket named:

```text
photos
```

To confirm it exists:

1. Go to Supabase.
2. Open **Storage**.
3. You should see a bucket called **photos**.
4. The bucket should be private, not public.

The app uploads album photos to this bucket and displays them using temporary signed URLs. That means photos are not public links.

## 8. Test Login Locally

Run the app:

```powershell
npm.cmd run dev
```

Open:

```text
http://127.0.0.1:5173
```

Expected behavior:

1. If `.env.local` is missing, you see a Supabase setup message.
2. If `.env.local` is correct, you see the sign-in page.
3. Sign in with one approved account.
4. The private app opens.
5. Sign out.
6. Sign in with the second approved account.
7. The same shared data should be visible.

## 9. Test Each App Feature

After logging in, test these pages:

- **Memory Timeline**: Add, edit, and delete a memory.
- **Love Notes Wall**: Add, edit, and delete a note.
- **Countdowns**: Edit the next trip date.
- **Photo Album**: Add a photo and caption. Confirm the photo appears.
- **Date Night Generator**: Favorite and complete an idea.
- **Map of Memories**: Add a pin by address/location name.
- **Shared Bucket List**: Add an item, mark it complete, undo completion, edit, and delete.
- **Next Visit Planner**: Edit visit details, add itinerary items, and use the checklists.
- **Two-City Weather**: Confirm Toronto and Calgary weather loads. This uses Open-Meteo, not Supabase.
- **Daily 3 List**: Add or edit today’s three gratitude items for each person.

To confirm syncing:

1. Open the app in another browser or on another device.
2. Sign in with the other approved account.
3. Confirm the data appears there too.

## 10. Troubleshooting

### “Supabase setup needed”

Your `.env.local` file is missing or has incorrect names.

Make sure it uses exactly:

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Restart the dev server after changing `.env.local`.

### “Invalid login credentials”

The account does not exist, the password is wrong, or email confirmation has not been completed.

Check Supabase → **Authentication** → **Users**.

### “Waiting for approval”

The user is signed in but not approved.

Fix:

1. Go to Supabase → **Table Editor**.
2. Open `profiles`.
3. Find the user’s email.
4. Set `is_approved` to `true`.

Only approve the two people who should access the app.

### Data does not save

Check these:

1. The SQL script ran successfully.
2. The user is approved.
3. The table exists.
4. Browser console does not show Supabase errors.
5. RLS policies exist on the table.

### Photos do not upload

Check:

1. Supabase Storage has a bucket named `photos`.
2. The bucket is private.
3. Storage policies from the SQL script were created.
4. You are signed in with an approved account.

### Weather does not load

The weather page uses Open-Meteo, not Supabase. If it fails, the app shows sample/fallback data.

### Local changes do not appear

If you recently changed `.env.local` or code:

1. Stop the dev server.
2. Start it again:

```powershell
npm.cmd run dev
```

## What Each Table Stores

### `approved_emails`

The two emails allowed to use the app.

### `profiles`

User profile records connected to Supabase Auth. Includes email, display name, and whether the user is approved.

### `memories`

Memory Timeline items: title, date, location, description, category, and optional photo URL.

### `love_notes`

Love Notes Wall entries: message, author name, date/time, and mood.

### `countdown_events`

Editable countdown data, currently used for the next trip/visit countdown.

### `photos`

Photo Album records: image path or URL, caption, date, and category.

### `date_ideas`

Optional database table for date ideas. The app currently keeps built-in ideas in code, but this table exists for future expansion.

### `favorite_date_ideas`

Tracks which built-in date ideas are favorited or completed.

### `memory_locations`

Map of Memories pins: place name, latitude, longitude, date, description, photo, and memory type.

### `bucket_list_items`

Shared Bucket List items: title, status, notes, target date, category, and completed-memory details.

### `next_visits`

Main Next Visit Planner details: title, dates, city, arrival/departure times, and travel notes.

### `visit_itinerary_items`

Plans inside the Next Visit itinerary.

### `visit_checklist_items`

Packing/reminder checklist items and “things we want to do together” items.

### `daily_three_entries`

Daily 3 gratitude entries. Each record stores one person’s three gratitude items for one date.

## How Privacy Works

The app uses three privacy layers:

1. **Supabase Auth**: Users must sign in.
2. **Approved profiles**: Only users marked `is_approved = true` can access shared app data.
3. **Row Level Security**: Supabase blocks database and storage access unless the signed-in user is approved.

The frontend cannot bypass these rules. Even if someone finds your Supabase URL and anon key, they still cannot read or write private app data unless their account is approved.

## Deploying to Vercel or Netlify

The Supabase URL and anon key are frontend environment variables. They are not secret like a service-role key. Privacy comes from RLS policies.

Never expose your Supabase **service role key** in this app.

### Vercel

1. Push the project to GitHub.
2. Import it into Vercel.
3. In Vercel project settings, go to **Environment Variables**.
4. Add:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
```

5. Deploy.
6. In Supabase Auth settings, add your deployed URL:

```text
https://your-vercel-app.vercel.app
https://your-vercel-app.vercel.app/*
```

### Netlify

1. Push the project to GitHub.
2. Import it into Netlify.
3. Go to **Site configuration** → **Environment variables**.
4. Add:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
```

5. Deploy.
6. In Supabase Auth settings, add your deployed URL:

```text
https://your-netlify-site.netlify.app
https://your-netlify-site.netlify.app/*
```

For both Vercel and Netlify, the build command is:

```text
npm run build
```

The output folder is:

```text
dist
```

## Final Checklist

- Supabase project created.
- `.env.local` created.
- SQL schema run.
- `approved_emails` contains the two real emails.
- Two users can sign in.
- Both users are approved in `profiles`.
- Photo bucket exists and is private.
- App runs locally.
- App data syncs between both accounts.
