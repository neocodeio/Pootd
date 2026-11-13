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
