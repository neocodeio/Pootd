# Pootd backend

Pootd uses Supabase for Postgres, Auth, Row Level Security, and Storage, plus a
small Express service for email OTP verification. The OTP service is required
because Pootd uses **4-digit codes**, while Supabase Auth only supports 6–10
digit OTPs.

The frontend still talks directly to Supabase for reads and writes using the
public `anon` key. The OTP service uses the `service_role` key only on the
server.

## Manual setup

1. Create a project at [supabase.com](https://supabase.com). Pick the region
   closest to your audience.
2. Open **SQL Editor** and run the migrations in order:
   - `supabase/migrations/0001_init.sql`
   - `supabase/migrations/0002_email_otp.sql`
   - `supabase/migrations/0003_profile_cover.sql`
   - `supabase/migrations/0004_bookmarks.sql`
   - `supabase/migrations/0005_notifications.sql`
   - `supabase/migrations/0006_reports.sql`
   - `supabase/migrations/0007_rate_limits.sql`
   - `supabase/migrations/0008_realtime.sql`
   - `supabase/migrations/0009_post_edit_marker.sql`
   - `supabase/migrations/0010_follows.sql`
   - `supabase/migrations/0011_follows_notifications.sql`
   - `supabase/migrations/0012_follow_counts.sql`
   - `supabase/migrations/0013_arabic_search.sql`
   - `supabase/migrations/0014_abuse_limits.sql`
   - `supabase/migrations/0015_post_images.sql`
   - `supabase/migrations/0016_mentions_replies.sql`
   - `supabase/migrations/0017_suggested_profiles.sql`
3. Open **Authentication → Sign In / Providers → Email** and keep
   **Confirm email enabled**. The OTP service creates users as unconfirmed and
   confirms them only after a valid 4-digit code.
4. Open **Authentication → URL Configuration** and set:
   - **Site URL**: `http://localhost:5173`
   - **Redirect URLs**: `http://localhost:5173/**` (add your production URL later)
5. Open **Project Settings → API** and copy:
   - **Project URL**
   - **anon public** key (for the frontend)
   - **service_role** key (for the backend only)
6. Create `frontend/.env` from `frontend/.env.example` and fill in:
   ```env
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-public-key
   VITE_API_URL=http://localhost:3000
   ```
7. Create `backend/.env` from `backend/.env.example` and fill in:
   ```env
   SUPABASE_URL=https://your-project-ref.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   OTP_SECRET=at-least-32-random-characters
   ```
8. Configure email delivery. Either:
   - Set `RESEND_API_KEY` and `EMAIL_FROM` for Resend, or
   - Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, and `SMTP_PASS`.

   In development, if no email provider is configured, the OTP is printed to the
   backend console instead of being emailed.
9. Install and start the OTP service:
   ```bash
   cd backend
   npm install
   npm run dev
   ```
10. Start the frontend:
    ```bash
    cd frontend
    npm install
    npm run dev
    ```

The `0001_init.sql` migration creates the public `avatars` storage bucket
(2 MB max, PNG/JPEG/WebP) with per-user upload policies. The
`0003_profile_cover.sql` migration adds the `cover_image_url` profile column and
the public `covers` storage bucket (5 MB max, PNG/JPEG/WebP) with the same
per-user upload policies. The `0004_bookmarks.sql` migration adds the
`bookmarks` table for saved posts, readable and writable only by its owner.
The `0005_notifications.sql` migration adds the notifications table and the
like/comment triggers that fill it. `0006_reports.sql` adds write-only reports
(one per member per item), and `0007_rate_limits.sql` enforces 5 posts and 20
comments per 10 minutes per user in the database. `0008_realtime.sql` adds
`posts`, `likes`, `comments` and `notifications` to the `supabase_realtime`
publication — without it the live like counters, comments and bell stay silent.
`0009_post_edit_marker.sql` swaps the posts `updated_at` trigger for one that
only fires when the content or tags change, and clears the timestamps that the
like/comment count updates had touched, so "معدّل" only appears after a real
edit. `0010_follows.sql` adds the `follows` social graph (follower to following,
with RLS-scoped writes and readable username lists) and puts it in the
`supabase_realtime` publication. `0011_follows_notifications.sql` adds the follow
notification type, the follow trigger and its removal on unfollow, and re-asserts
the `follows` publication membership (guarded, so it is safe on an existing
project that applied `0010` before that line existed). `0012_follow_counts.sql`
maintains follower/following counters on the profile row, `0013_arabic_search.sql`
adds normalized search columns and RPCs, and `0014_abuse_limits.sql` caps likes,
follows, bookmarks and reports. `0015_post_images.sql` adds `posts.image_url`
and the public `post-images` bucket (5 MB max, PNG/JPEG/WebP). `0016_mentions_replies.sql`
adds `comments.parent_id`, mention parsing, and the `mention`/`reply`
notification triggers. `0017_suggested_profiles.sql` adds the RPC behind the
Explore "who to follow" list.

If the API does not pick up the new `cover_image_url` column right away, run
`NOTIFY pgrst, 'reload schema';` in the SQL Editor.

## OTP API

The frontend calls these endpoints using `VITE_API_URL`:

- `POST /api/auth/signup` — validates the profile, creates an unconfirmed
  Supabase user, stores an OTP, and sends the code.
- `POST /api/auth/otp/resend` — sends a new code, subject to cooldown and rate
  limits.
- `POST /api/auth/otp/verify` — verifies the code, confirms the Supabase user,
  and returns the user ID.
- `DELETE /api/account` — deletes the signed-in account. Requires the Supabase
  access token as `Authorization: Bearer <token>`; the service role removes the
  auth user and the database cascades the profile, posts, comments, likes and
  bookmarks.
- `GET /health` — service health check.

OTP defaults:

- 4-digit code, HMAC-SHA256 hashed with `OTP_SECRET`
- 10-minute expiry
- 60-second resend cooldown
- 5 attempts per code and 20 total attempts per 15 minutes
- 5 sends per email per 15 minutes
- Per-IP rate limiting on auth endpoints

## Security model

- RLS is enabled on every public table.
- Users can only write their own posts, comments, likes, and profile.
- Post authors can delete comments on their own posts; comment authors can
  delete their own comments.
- Counters (`like_count`, `comment_count`), `author_id`, timestamps, and IDs are
  not writable through the public API — column grants + SECURITY DEFINER
  triggers maintain them.
- Profile emails are never stored in `public.profiles`; the public API cannot
  read `auth.users`.
- The `email_otps` table is not accessible to `anon` or `authenticated`; only
  `service_role` can read or write it.
- OTP verification and email-to-user lookup use `service_role`-only database
  functions.
- The `anon` key is safe to ship in a browser build. Never ship the
  `service_role` key or `OTP_SECRET`.

## Optional: Supabase CLI

If you prefer migrations over the dashboard:

```bash
npm i -g supabase
supabase login
supabase link --project-ref <your-project-ref>
supabase db push
```
