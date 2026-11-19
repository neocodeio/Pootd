# Pootd — agent guide

Pootd is an Arabic-first (RTL) cybersecurity community. The UI is a minimal,
quiet, monochrome product: near-black surfaces in dark mode, near-white in light
mode, one accent (the red like heart) and nothing else colourful.

## The one rule

**Do not redesign the UI.** The layout below is the approved design and the
owner has rejected a redesign of it before. Extend it, fix bugs in it, add
features inside it — but keep the visual language and the spacing.

If a request sounds like "make it look nicer / redesign / modernise", treat it
as *"match the reference spec below exactly"* and ask before changing
structure.

## Golden reference

`docs/reference/feed-1920-dark.png` is the owner's approved target: the
logged-in feed at a 1920px viewport in dark mode (1919×941 capture). Every
radius, height and gap below was measured from that file. When something looks
off, compare against the image — not against taste. Do not re-crop, re-tint or
"improve" it.

Measured geometry at 1920px (dark):

| Element | Measurement |
| --- | --- |
| Header row | border at `y 62`, content `h-16` |
| Nav active pill | `94×36`, fully rounded, `px-3.5 py-2`, `bg-secondary` |
| Create button | `120×40`, fully rounded, `px-5`, `bg-primary` |
| Brand wordmark | `120×28` visible (`h-7`), tagline `91px` wide under it |
| Page title | 24px / 700 weight |
| Tabs track | `139×32`, fully rounded; active pill `70×25`, fully rounded |
| Composer card | `624×234` in the reference (`195` now — the tag row is gone) |
| Composer textarea | `96px` tall (one line), divider 169px from card top |
| Publish pill | `69×30`, fully rounded |
| Post card | `624×195` (one-line post), radius 18px |
| Action row buttons | `32px` tall, fully rounded |

## Owner overrides (apply on top of the reference)

These are deliberate deviations from `docs/reference/feed-1920-dark.png`. Do
not "fix" them back without asking:

- The feed page title is **not rendered**: keep `<h1 className="sr-only">
  الرئيسية</h1>` for screen readers only. The subtitle stays visible and the
  segmented tabs sit on its line.
- The composer keyboard hint ("Ctrl + Enter للنشر") is **not rendered**; the
  footer shows only the `0/4000` counter (submitting with Ctrl/⌘+Enter still
  works).
- The liked heart is **red** (`--like`), not white as in the reference image.
- **Hashtags are inline, not a separate tag row.** The composer has no tag
  input and posts have no tag pills under the text. The author types `#tag`
  inside the post, it stays exactly where they typed it, and it renders in
  `--tag` blue: Latin hashtags link to `/tags/:tag`, Arabic or otherwise
  unstorable hashtags are highlighted but not linked. The `tags` column in the
  database is still populated by parsing the content (`extractTags` in
  `lib/validation.ts`) so trending tags, tag pages and search keep working.
- **The header carries a notifications bell** next to the theme toggle (desktop
  and mobile). It is the only approved addition to the reference header; it may
  shift the create button a few pixels. The unread badge is monochrome
  (`bg-foreground text-background`), never `--like` red.
- **The header nav carries a search link** ("بحث", `Search01Icon`) between
  استكشف and ملفي, and the mobile bottom bar has five items (الرئيسية، استكشف،
  أنشئ، بحث، حسابي) with أنشئ still centred. Because the fourth desktop nav
  item does not fit beside the brand between 640 and 1023px, the desktop chrome
  (header, footer, `lg:pb-12`, the mobile-bar swap) starts at `lg`. From 1024px
  up the layout matches the reference exactly; below it the compact mobile
  header and bottom nav are used.

## Reference layout (approved)

| Element | Spec |
| --- | --- |
| Page background | `bg-background` — flat, no gradients, no shadows on the page |
| Header | `h-16`, `max-w-5xl`, `px-6`, `border-b border-border/80`, `bg-background/80 backdrop-blur-xl` |
| Header start group (left) | theme toggle → "أنشئ منشور" pill → user avatar (`size-11`) |
| Header end group (right) | brand lockup → nav (الرئيسية / استكشف / بحث / ملفي) |
| Header nav | `gap-1`; items `h-9 rounded-full px-3.5 py-2 gap-2 text-sm font-medium`, icon `size-4`; active item `bg-secondary` |
| Brand lockup | wordmark `h-7` (`120×28`) + tagline `مجتمع الأمن السيبراني` at `text-[11px]` with `mt-1`, aligned to the end edge |
| Create button | `h-10 rounded-full px-5`, primary fill, `PencilEdit02Icon` + "أنشئ منشور" |
| Feed column | `max-w-2xl` centred, `px-4 sm:px-6`, vertical rhythm `space-y-4` |
| Page header | subtitle `text-sm` on the start (right) edge (title is screen-reader only — see overrides); segmented tabs on the end (left) edge |
| Segmented tabs | track `h-8 rounded-full p-[3px] bg-secondary/60`; trigger `rounded-full px-3.5 text-sm`, active `bg-secondary shadow-sm` |
| Cards | `rounded-2xl border border-border bg-card`, `p-4 sm:p-5` |
| Footer | hidden below `lg`, single row, `text-xs text-muted-foreground` |

## Post card anatomy (approved)

```
┌──────────────────────────────────────────────┐
│ [avatar 40px]  Name  @user · قبل 12 دقيقة   ⋯  │   ← ⋯ on the end (left) edge
│                                              │
│        Post content, 15px/leading-8           │
│        with #hashtags in place, blue          │
│                                              │
│   ♡ 1   💬 1   🔗                             │   ← no divider above this row
└──────────────────────────────────────────────┘
```

Rules that must hold:

- Content: `text-[15px] leading-8` (`text-[16px]` on the detail page),
  `text-foreground/95`, `whitespace-pre-wrap break-words`, `dir="auto"`.
  **Text must stay selectable** — never wrap the body in a stretched link.
- Clamp long posts at `line-clamp-10` and show the "اقرأ المنشور كاملًا" link.
- Hashtags render inline in the content (`PostContent` / `post-content.tsx`)
  in `text-tag` blue, exactly where the author typed them — no pills and no
  tag list after the text. Never re-add a stretched link around the body.
- @mentions also render inline, as monochrome profile links
  (`font-medium text-foreground`, underline on hover) to `/u/:username`. Only
  `@[A-Za-z0-9_]{3,24}` after a non-word boundary counts, so `name@example.com`
  stays plain text. Comments render through the same `PostContent`.
- A post may carry **one optional image**: full-width inside the card,
  `mt-3 rounded-xl border border-border`, `max-h-[32rem] object-contain`,
  clicking opens the shared `ImagePreview` lightbox. Deleting the post deletes
  its `post-images` object too.
- Action row: `mt-3 flex items-center gap-0.5`, **no divider**, ghost buttons
  sized `sm`, `h-8 rounded-full px-2.5 text-xs`. Order (start → end):
  like → comments → bookmark → share. The last button opens the share dialog;
  the copy-link action lives in the share dialog only (copy pill), not in the
  `⋯` menu.
- The like heart turns **red** when liked: `fill-like text-like` on the icon
  only (`--like` token). The count stays `text-muted-foreground`. Never use a
  colour other than `--like` for the heart.
- The `⋯` menu is muted and only appears at the end of the header row.
- Edited posts show `· معدّل` next to the timestamp.

## Composer (approved)

- Avatar `size-10` at the start (right) edge, textarea next to it,
  `min-h-24`, borderless/transparent, `text-[15px] leading-7`, `px-1`
  (0 padding clips Arabic glyphs in RTL — keep the 4px).
- No tag input row. Hashtags are typed directly in the textarea as `#tag`;
  on submit the tags are parsed from the content.
- Footer row: `mt-3 border-t border-border pt-3`; the counter `0/4000` on the
  start edge (the keyboard hint stays hidden — see overrides); the
  `rounded-full px-4` "نشر" pill with the `SentIcon` on the end (left) edge.
- One optional image per post: an `ImageAdd01Icon` ghost button beside the
  counter opens a PNG/JPEG/WebP picker (5 MB max). The selected image previews
  above the footer (`max-h-80`, same `ImagePreview` lightbox) with a
  `Cancel01Icon` remove button, and is uploaded to `post-images` before the
  row is inserted. If the insert fails the upload is deleted again.
- Submit with `Ctrl/⌘ + Enter` as well as the button; the button is disabled
  while the textarea is empty or a post is in flight.

## OTP code input (approved)

`components/auth/otp-input.tsx` — the email code is **one box per digit**, not
a single field:

- Four boxes, `h-14 w-11`, `rounded-xl`, `border bg-card`, `font-mono text-2xl`,
  `gap-2.5`, centred in the form, `dir="ltr"` so the digits read 1→2→3→4.
- Filled boxes get `border-foreground/30 bg-secondary`; the focused box uses
  the normal input focus ring (`border-foreground/40 ring-3 ring-ring/30`).
- Typing advances, backspace clears and walks back, arrow keys move, and a
  pasted or autofilled code spreads across the boxes. The parent clears the
  row by remounting it with a new `key`.
- Keep `autoComplete="one-time-code"` on the first box, and the group labelled
  "رمز التحقق" for screen readers.

## Typography

- `--font-sans` and `--font-heading` are IBM Plex Sans Arabic. The font is
  self-hosted: `src/main.tsx` imports the `@fontsource/ibm-plex-sans` (latin) and
  `@fontsource/ibm-plex-sans-arabic` (arabic) 400/500/600/700 stylesheets.
  **Keep those imports**: without them the browser falls back to Segoe UI and
  every Arabic glyph, width and height shifts away from the reference.
  Do not add a Google Fonts `<link>` — it would double-load the family.
- Headings use `font-heading`; the feed title is `text-2xl font-bold
  tracking-tight`.

## Icons

Every icon in the product is a **Hugeicons** icon — `lucide-react` is gone and
must not come back. Data lives in `@hugeicons/core-free-icons` (v4) and is
rendered by `HugeiconsIcon` from `@hugeicons/react`:

```tsx
import { FavouriteIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

<HugeiconsIcon icon={FavouriteIcon} className="size-4" />
```

- Import the icon data and `HugeiconsIcon` per file; there is no local wrapper.
  `components.json` declares `"iconLibrary": "hugeicons"` for new shadcn pulls.
- Size with the same Tailwind classes as before (`size-4`, `size-5`,
  `size-3.5`). Inside `Button`/`DropdownMenuItem` a bare icon is sized by the
  existing `[&_svg:not([class*='size-'])]:size-4` rule, so no class is needed.
- Keep Hugeicons' native `1.5` stroke for UI icons. Only the verified badge
  overrides it (`strokeWidth={2}` on `CheckmarkBadge02Icon`).
- Use the semantic name that matches the intent, not the closest glyph:
  `FavouriteIcon` (heart), `Comment01Icon` (comments), `Bookmark01Icon`,
  `Link04Icon` (copy link), `Share08Icon` (share — opens the share dialog),
  `SentIcon` (publish), `PencilEdit02Icon` (create),
  `Cancel01Icon` (close/x), `Loading03Icon` (`animate-spin` for pending).
- Toasts (`components/ui/sonner.tsx`) use `CheckmarkCircle02Icon`,
  `InformationCircleIcon`, `Alert02Icon`, `OctagonXIcon`, `Loading03Icon`.

## Colour tokens

Never hard-code colours. Use the semantic tokens in `src/index.css`:
`background`, `foreground`, `card`, `popover`, `primary`, `secondary`, `muted`,
`accent`, `destructive`, `border`, `input`, `ring`, `like`, `tag`.

The `.dark` block mirrors the `:root` block. If you add a token, add it to
both. `--like` is the heart accent: `oklch(0.58 0.22 25)` light,
`oklch(0.70 0.19 25)` dark. `--tag` is the hashtag accent:
`oklch(0.52 0.16 255)` light, `oklch(0.74 0.12 255)` dark. `--verified-check`
is the tick inside the verified seal, `oklch(1 0 0)` white in both themes.
Those are the only colours in the product.

## Verified badge

The badge (`components/verified-badge.tsx`) is the `CheckmarkBadge02Icon`
Hugeicons seal: the silhouette path is filled `--tag` blue and keeps its 1.5
stroke so the wavy points stay round, and the tick path is drawn again on top in
`--verified-check` white (`strokeWidth={2.5}`) so it reads as a cut-out. Default
`size-4` next to the profile name, `size-3.5` in lists/search/notifications,
labelled `حساب موثّق` for screen readers. It renders beside the display name on
the profile header, post cards, comments, follower/following lists, search
results and notifications. Verified accounts live in
`frontend/src/lib/verified.ts` (currently `amin`); add a username there to
verify that account.

Hovering the badge shows a Radix tooltip (`components/ui/tooltip.tsx`, provider
in `App.tsx`) reading **«هالحساب موثّق»** — Saudi dialect, anchored above the
badge. Do not add a `title` attribute back: it would double up with the tooltip.
Keep the tooltip monochrome (`bg-foreground text-background`), `text-xs`, and
never the `--like` red.

## Social accounts

A profile can carry up to three social accounts, rendered **icon-only** under
the bio (`components/profile/profile-header.tsx`): `size-9 rounded-full border
border-border` links with a Radix tooltip naming the platform and an
`aria-label`, `target="_blank"` + `rel="noreferrer noopener"`. Never render the
account URL or a text link for these.

- Platforms: X, GitHub, LinkedIn, Instagram, Telegram, YouTube — config and URL
  rules live in `lib/social.ts` (`SOCIAL_PLATFORMS`), icons are Hugeicons.
- Settings (`pages/settings.tsx`) edits them inside the profile form: up to
  three rows (leading platform icon, platform select, URL input, remove
  button), an "إضافة حساب" button disabled at 3 and an `n/3` counter. Changing
  a row's platform clears its URL.
- `https` only, each URL must be on the platform's own domain (lookalikes
  rejected), one entry per platform, three at most — enforced in the frontend
  and mirrored in the database.
- Column: `profiles.social_links` jsonb (`[]` default) with
  `valid_social_links(jsonb)` and `profiles_social_links_check` from
  `0018_social_links.sql`, which also copies an existing `profiles.github`
  into the list once. `profiles.github` stays for history but is no longer
  shown or edited anywhere in the UI.

## Share dialog (approved)

`components/post/share-dialog.tsx` — a post's last action-row button opens it;

- Layout is a fixed three-row column: `DialogHeader` (shrink-0, `px-4 pb-3 pe-12 pt-4`),
  a scrollable body (`min-h-0 flex-1 overflow-y-auto space-y-3 px-4 pb-4`) and a fixed
  `DialogFooter` (`shrink-0 flex-row justify-end gap-2 border-t px-4 py-3`). The dialog
  itself is `flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden p-0` with
  `rounded-xl`, so it always stays inside the viewport at any height and only the middle
  section scrolls on very short screens (below ~360px tall). Footer corners are
  `rounded-b-xl` to match the shell.
- Quote preview card (author + 2-line excerpt, `rounded-xl border bg-secondary/25 p-2.5`,
  name `text-[11px]`, excerpt `text-[12.5px] leading-5`).
- Three monochrome platform buttons in a 3-column grid (one row): X, Telegram, Reddit;
  `size-9` circles and `text-[11px]` labels so the row fits a 288px dialog. Each opens its
  web-intent URL (X `intent/post`, `t.me/share`, Reddit submit). WhatsApp, LinkedIn and
  email were removed from the dialog as requested.
- Copy-link row (ltr URL + icon-only copy button `aria-label="نسخ رابط المنشور"` that flips
  to the check icon) — the only copy entry for posts, already inside this dialog (the
  standalone copy action was removed).
- Native share sheet via `navigator.share` when supported; the footer is a ghost `إغلاق`
  plus a compact primary `مشاركة` button (not the long "مشاركة عبر التطبيقات" label, which
  overflowed narrow phones). Same primitives and design tokens as the report dialog.

Shared text (`lib/share.ts`): `«excerpt» — author (@user) على Pootd`; excerpt
default 160 chars, word-boundary cut with `…`; title 100 chars for Reddit/email.

## Radii

- Cards: `rounded-2xl` (18px) — composer, post cards, dialogs.
- Interactive pills: `rounded-full` — nav items, tabs track and trigger,
  like/bookmark/copy buttons, publish button, create button.
- Nothing has a chat bubble radius; do not mix `rounded-md`/`rounded-lg` into
  pill-shaped controls.

## RTL rules

- `dir="rtl"` on `<html>`; `dir="auto"` on user-generated text (content, names,
  bios); `dir="ltr"` on Latin-only strings (usernames, tags, emails, URLs).
- Use logical properties (`ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`), never
  left/right.
- Chevron icons point the way the reader travels: `ChevronLeftIcon` for "more" in
  RTL.

## Logo

- Header wordmark: `public/pootd-wordmark.png` (thin pixel wordmark, rebuilt
  from `pootd_white-removebg.png`), displayed at `h-7`, `w-auto`, `dark:invert`.
- App icon: `public/pootd_icon_black.png` / `pootd_icon_white.png` (the owner
  supplied these); favicons are the optimised `icon-light.png` /
  `icon-dark.png` with `prefers-color-scheme` media queries.

## Working rules

- Run `npm run typecheck`, `npm run lint`, `npm test` and `npm run build` in
  `frontend/` before saying a change is done. For `backend/`, `node --check`
  each file in `src/`.
- Verify visually in a real browser (headless Chrome over CDP) before claiming
  a UI change works — screenshots at 1920×919 (desktop) and 390×844 (mobile),
  in both light and dark mode. Compare the desktop dark shot with
  `docs/reference/feed-1920-dark.png`.
- Arabic text must be checked as rendered. Reading Arabic through a PowerShell
  terminal shows `????` — that is the console, not the file.
- Database changes go in a new numbered migration under
  `backend/supabase/migrations/`; the owner runs them in the Supabase SQL
  editor, so always tell them which file to run.
- Counters live on the row: `posts.like_count` / `comment_count` and
  `profiles.followers_count` / `following_count` are trigger-maintained. Read
  them; never derive a count by fetching a list and measuring its length.
- Search compares the normalized `search_text` columns. `normalizeArabic` in
  `frontend/src/lib/validation.ts` mirrors `public.normalize_arabic` in
  `0013_arabic_search.sql` — change both together.
