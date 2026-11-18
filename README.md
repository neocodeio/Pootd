# Pootd

A minimalist cybersecurity community for the Arab world. Share findings, ask hard
questions, and connect with researchers, builders, and students. The UI is Arabic
and RTL-first.

This repository contains the MVP: a React + TypeScript frontend, a Supabase
backend (Postgres, Auth, Storage, Row Level Security), and a small Express
service for 4-digit email OTP verification.

## Stack

**Frontend** — React 19, TypeScript, Vite, Tailwind CSS v4, shadcn/ui (Radix),
React Router, TanStack Query, Supabase JS, Sonner, IBM Plex Sans Arabic + IBM Plex
Sans.

**Backend** — Supabase: Postgres, Auth (email/password), Storage (avatars), RLS,
column-level privileges, SQL triggers for counters and tag normalization. Plus an
Express OTP service using the Supabase `service_role` key and Resend/SMTP.

## Structure

```
pootd/
├─ frontend/                 React app
│  ├─ src/components/        UI, layout, posts, profile, auth
│  ├─ src/hooks/             auth + TanStack Query hooks
│  ├─ src/lib/               Supabase client, API, types, validation
│  ├─ src/pages/             route pages
│  └─ .env.example
└─ backend/
   ├─ README.md              manual Supabase + OTP setup
   ├─ src/                   Express OTP service
   ├─ .env.example
   └─ supabase/migrations/
      ├─ 0001_init.sql       schema, RLS, triggers, storage
      ├─ 0002_email_otp.sql  OTP table + service-role functions
      ├─ 0003_profile_cover.sql  cover image column + covers bucket
      ├─ 0004_bookmarks.sql  saved posts table + RLS
      ├─ 0005_notifications.sql  notifications table, triggers, RLS
      ├─ 0006_reports.sql    reports table + owner-only RLS
      ├─ 0007_rate_limits.sql  post/comment rate-limit triggers
      ├─ 0008_realtime.sql   realtime publication for live updates
      ├─ 0009_post_edit_marker.sql  "معدّل" only after a real edit
      ├─ 0010_follows.sql   followers / following social graph
      ├─ 0011_follows_notifications.sql  follow notifications + live follow numbers
      ├─ 0012_follow_counts.sql  public follower / following counters
      ├─ 0013_arabic_search.sql  Arabic-normalized search columns and indexes
      └─ 0014_abuse_limits.sql   rate limits + trending-tag minimum
```

## Setup

### 1. Supabase

Follow [`backend/README.md`](backend/README.md). In short:

1. Create a project at [supabase.com](https://supabase.com).
2. Run `backend/supabase/migrations/0001_init.sql`,
   `backend/supabase/migrations/0002_email_otp.sql`,
   `backend/supabase/migrations/0003_profile_cover.sql`,
   `backend/supabase/migrations/0004_bookmarks.sql`,
   `backend/supabase/migrations/0005_notifications.sql`,
   `backend/supabase/migrations/0006_reports.sql`,
   `backend/supabase/migrations/0007_rate_limits.sql`,
   `backend/supabase/migrations/0008_realtime.sql`,
   `backend/supabase/migrations/0009_post_edit_marker.sql`,
   `backend/supabase/migrations/0010_follows.sql`,
   `backend/supabase/migrations/0011_follows_notifications.sql`,
   `backend/supabase/migrations/0012_follow_counts.sql`,
   `backend/supabase/migrations/0013_arabic_search.sql`,
   `backend/supabase/migrations/0014_abuse_limits.sql`,
   `backend/supabase/migrations/0015_post_images.sql`,
   `backend/supabase/migrations/0016_mentions_replies.sql`, and
   `backend/supabase/migrations/0017_suggested_profiles.sql` in the **SQL
   Editor**.
3. Keep **Confirm email enabled**. The OTP service confirms users after a valid
   4-digit code.
4. Set **Site URL** to `http://localhost:5173` and add
   `http://localhost:5173/**` to **Redirect URLs**.
5. Copy the **Project URL**, **anon public** key, and **service_role** key.

### 2. Frontend

```bash
cd frontend
npm install
copy .env.example .env
```

Fill `frontend/.env`:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
VITE_API_URL=http://localhost:3000
```

Then:

```bash
npm run dev
```

### 3. OTP service

```bash
cd backend
npm install
copy .env.example .env
```

Fill `backend/.env` with `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
`OTP_SECRET` (at least 32 random characters), and either `RESEND_API_KEY` /
`EMAIL_FROM` or the `SMTP_*` variables. Without an email provider in development,
the code is printed to the backend console.

Then:

```bash
npm run dev
```

If the app opens with a setup screen, the frontend environment variables are
missing or still contain placeholder values. Save `.env` and restart Vite.

## Scripts

Run from `frontend/`:

| Command | What it does |
| --- | --- |
| `npm run dev` | Local dev server |
| `npm run build` | Type-check and production build |
| `npm run typecheck` | TypeScript only |
| `npm run lint` | Oxlint |
| `npm test` | Vitest unit tests |
| `npm run preview` | Preview the production build |

Run from `backend/`:

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the OTP service with file watching |
| `npm start` | Start the OTP service |

## MVP features

- Public feed with newest / most-liked sorting.
- Post composer with up to five normalized tags.
- Editing your own posts, with an "معدّل" marker.
- Search across posts and members (`/search`), Arabic-aware — alef/hamza, taa
  marbuta and alef maqsura variants match — with paginated post results.
- Save posts to your profile ("المحفوظات").
- Likes with optimistic UI and server-maintained counters.
- Flat comments with author/post-author delete permissions.
- Tag pages and an Explore page with trending tags (a tag trends after two
  posts, so one-off tags stay out).
- Profiles: bio, links, join date, stats, posts tab, liked-posts tab, and
  follower/following counters that are correct for signed-out visitors.
- Editable profile with avatar upload (PNG/JPG/WebP, 2 MB max) and a cover image
  (PNG/JPG/WebP, 5 MB max).
- Click the avatar or the cover image to open a full-size preview.
- Email/password auth with 4-digit email OTP confirmation and protected write
  actions.
- Responsive RTL layout with a desktop header and mobile bottom navigation.
- Dark mode with a light / dark / system preference that persists across visits
  and never flashes the wrong theme on load.
- Database-enforced rate limits on posts, comments, likes, follows, bookmarks and
  reports.
- Skeleton loading, empty states, error states, and toasts.
- An app-level error boundary instead of a blank page when a screen throws.

## Security model

- RLS is enabled on `profiles`, `posts`, `likes`, `comments`, and `bookmarks`.
- Column-level grants stop clients from forging counters, IDs, authors, or
  timestamps. Counters (likes, comments, followers, following) are updated by
  `SECURITY DEFINER` triggers.
- Rate limits for posts, comments, likes, follows, bookmarks and reports are
  enforced in Postgres (`0007`, `0014`), so the anon key cannot bypass them.
- Users can only write rows they own. Post authors can also delete comments on
  their own posts.
- Profiles never expose emails; `auth.users` is not publicly readable.
- Avatars live in a public bucket with per-user write policies and MIME/size
  limits.
- Cover images live in a separate public bucket with the same per-user write
  policies.
- User content is rendered as plain text (no `innerHTML`), and external links use
  `rel="noreferrer noopener"`.
- OTP codes are stored only as HMAC-SHA256 hashes; the `email_otps` table and
  lookup functions are restricted to `service_role`.
- Only the Supabase **anon** key is used in the browser. Never ship the
  `service_role` key or `OTP_SECRET`.

## Deployment notes

- Deploy `frontend/` to Vercel, Netlify, or Cloudflare Pages (build
  `npm run build`, output `dist`).
- Configure an SPA fallback to `index.html` if your host does not do it
  automatically.
- The included Vercel config (`frontend/vercel.json` + `frontend/api/og.js`)
  serves per-URL Open Graph tags for `/p/:id`, `/u/:username` and `/tags/:tag`.
  Deploy with `frontend/` as the project root and set `PUBLIC_SITE_URL` to the
  canonical domain so every `og:url`/`og:image` is absolute. On Netlify or
  Cloudflare Pages, port the handler to an edge function and mirror the three
  rewrites; an SPA fallback by itself does not add per-post meta.
- Add the production domain to Supabase **Site URL** and **Redirect URLs**.
- Deploy `backend/` to a Node host, set `APP_ORIGINS` to the frontend origin, and
  configure all backend environment variables.
- Set the three `VITE_` variables in the frontend host dashboard.
- Consider adding security headers (CSP, HSTS, `X-Content-Type-Options`) at the
  edge.

## Intentionally out of scope

- Direct messages — a phishing surface this MVP does not want to moderate yet.
- A moderation UI: reports are stored and RLS-protected, but the queue is
  reviewed from the Supabase dashboard for now.
- Notification email digests.

The schema and API layer are structured so these can be added without reworking
the basics.
