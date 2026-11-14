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

## Reference layout (approved)

Measured from the owner's screenshot at a 1920px viewport:

| Element | Spec |
| --- | --- |
| Page background | `bg-background` — flat, no gradients, no shadows on the page |
| Header | `h-16`, `max-w-5xl`, `px-6`, `border-b border-border/80`, `bg-background/80 backdrop-blur-xl` |
| Header left group | theme toggle → "أنشئ منشور" button → user avatar |
| Header right group | brand lockup → nav (الرئيسية / استكشف / ملفي) |
| Brand lockup | thin pixel wordmark `h-9` (≈155px wide) + tagline `مجتمع الأمن السيبراني` at `text-[11px]`, right-aligned under it |
| Feed column | `max-w-2xl` centred, `px-4 sm:px-6` |
| Page header | title + subtitle on the start (right) edge, segmented tabs on the end (left) edge |
| Cards | `rounded-2xl border border-border bg-card`, `p-4 sm:p-5` |
| Footer | hidden below `sm`, single row, `text-xs text-muted-foreground` |

## Post card anatomy (approved)

```
┌──────────────────────────────────────────────┐
│ [avatar 40px]  Name  @user · قبل 12 دقيقة   ⋯  │   ← ⋯ on the end (left) edge
│                                              │
│              Post content, 15px/leading-8     │
│                                              │
│              #tag #tag                       │
│                                              │
│   ♡ 1   💬 1   🔗                             │   ← no divider above this row
└──────────────────────────────────────────────┘
```

Rules that must hold:

- Content: `text-[15px] leading-8` (`text-[16px]` on the detail page),
  `text-foreground/95`, `whitespace-pre-wrap break-words`, `dir="auto"`.
  **Text must stay selectable** — never wrap the body in a stretched link.
- Clamp long posts at `line-clamp-10` and show the "اقرأ المنشور كاملًا" link.
- Tags are plain `Badge variant="secondary"` pills, `#tag`, `dir="ltr"`.
- Action row: `mt-3 flex items-center gap-0.5`, **no divider**, ghost buttons
  sized `sm`, `rounded-full px-2.5 text-xs`. Order (start → end):
  like → comments → bookmark → copy-link.
- The like heart fills red when liked (`--like` token), never another colour.
- The `⋯` menu is muted and only appears at the end of the header row.
- Edited posts show `· معدّل` next to the timestamp.

## Composer (approved)

- Avatar `size-10` at the start (right) edge, textarea next to it,
  `min-h-24`, borderless/transparent, `text-[15px] leading-8`, `px-1`
  (0 padding clips Arabic glyphs in RTL — keep the 4px).
- Tag row sits under the text column, `#` on the start edge.
- Footer row: counter + "Ctrl + Enter للنشر" on the start edge, the "نشر" button
  on the end (left) edge.

## Colour tokens

Never hard-code colours. Use the semantic tokens in `src/index.css`:
`background`, `foreground`, `card`, `popover`, `primary`, `secondary`, `muted`,
`accent`, `destructive`, `border`, `input`, `ring`, `like`.

The `.dark` block mirrors the `:root` block. If you add a token, add it to
both. `--like` is the only accent: `oklch(0.58 0.22 25)` light,
`oklch(0.70 0.19 25)` dark.

## RTL rules

- `dir="rtl"` on `<html>`; `dir="auto"` on user-generated text (content, names,
  bios); `dir="ltr"` on Latin-only strings (usernames, tags, emails, URLs).
- Use logical properties (`ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`), never
  left/right.
- Chevron icons point the way the reader travels: `ChevronLeft` for "more" in
  RTL.

## Logo

- Header wordmark: `public/pootd-wordmark.png` (thin pixel wordmark, rebuilt
  from `pootd_white-removebg.png`), displayed at `h-9`, `dark:invert`.
- App icon: `public/pootd_icon_black.png` / `pootd_icon_white.png` (the owner
  supplied these); favicons are the optimised `icon-light.png` /
  `icon-dark.png` with `prefers-color-scheme` media queries.

## Working rules

- Run `npm run typecheck`, `npm run lint`, `npm run build` in `frontend/` before
  saying a change is done. For `backend/`, `node --check` each file in `src/`.
- Verify visually in a real browser (headless Chrome over CDP) before claiming
  a UI change works — screenshots at 1920×919 (desktop) and 390×844 (mobile),
  in both light and dark mode.
- Arabic text must be checked as rendered. Reading Arabic through a PowerShell
  terminal shows `????` — that is the console, not the file.
- Database changes go in a new numbered migration under
  `backend/supabase/migrations/`; the owner runs them in the Supabase SQL
  editor, so always tell them which file to run.
