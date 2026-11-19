import {
  NewTwitterIcon,
  RedditIcon,
  TelegramIcon,
} from '@hugeicons/core-free-icons'
import type { IconSvgElement } from '@hugeicons/react'

/** Characters of the post copied into the shared message. */
export const SHARE_EXCERPT_LENGTH = 160

export interface ShareablePost {
  id: string
  content: string
  author: {
    display_name: string
    username: string
  }
}

export type ShareTargetId =
  | 'x'
  | 'linkedin'
  | 'whatsapp'
  | 'telegram'
  | 'reddit'
  | 'email'

export interface ShareTarget {
  id: ShareTargetId
  label: string
  icon: IconSvgElement
  href: string
}

/**
 * Collapses the post into one line and cuts it on a word boundary, so the
 * shared message never ends mid-word or sends an entire long post.
 */
export function shareExcerpt(content: string, limit = SHARE_EXCERPT_LENGTH): string {
  const text = content.replace(/\s+/g, ' ').trim()
  if (text.length <= limit) return text

  const slice = text.slice(0, limit)
  const breakAt = slice.lastIndexOf(' ')
  const body = breakAt >= Math.floor(limit * 0.6) ? slice.slice(0, breakAt) : slice
  return `${body.trimEnd()}…`
}

/** The message posted to X, Telegram or WhatsApp: quote + author credit. */
export function buildShareText(
  post: ShareablePost,
  limit = SHARE_EXCERPT_LENGTH,
): string {
  const author = post.author.display_name.trim() || `@${post.author.username}`
  return `«${shareExcerpt(post.content, limit)}» — ${author} (@${post.author.username}) على Pootd`
}

/** Reddit and email need a subject line; keep it short and attributed. */
export function buildShareTitle(post: ShareablePost): string {
  const author = post.author.display_name.trim() || `@${post.author.username}`
  return `«${shareExcerpt(post.content, 100)}» — ${author} على Pootd`
}

/**
 * Web intent links for every platform. The post URL is passed as its own
 * parameter where the platform supports it so the preview card stays intact.
 */
export function buildShareTargets(post: ShareablePost, url: string): ShareTarget[] {
  const text = buildShareText(post)
  const title = buildShareTitle(post)
  const encodedUrl = encodeURIComponent(url)
  const encodedText = encodeURIComponent(text)
  const encodedTitle = encodeURIComponent(title)

  return [
    {
      id: 'x',
      label: 'X',
      icon: NewTwitterIcon,
      href: `https://x.com/intent/post?text=${encodedText}&url=${encodedUrl}`,
    },
    {
      id: 'telegram',
      label: 'تيليجرام',
      icon: TelegramIcon,
      href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
    },
    {
      id: 'reddit',
      label: 'Reddit',
      icon: RedditIcon,
      href: `https://www.reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`,
    },
  ]
}
