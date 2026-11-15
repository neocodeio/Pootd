export const USERNAME_REGEX = /^[a-z0-9_]{3,24}$/
export const TAG_REGEX = /^[a-z0-9][a-z0-9-]{0,23}$/

export function normalizeUsername(input: string): string {
  return input.trim().toLowerCase()
}

export function normalizeTag(input: string): string {
  return input.trim().toLowerCase().replace(/^#+/, '')
}

export const MAX_TAGS = 5

/** Finds `#hashtag` tokens in post content — Latin or Arabic. */
export const HASHTAG_REGEX = /(?<![A-Za-z0-9_#/])#[\p{L}\p{N}_-]+/gu

/**
 * Extracts the tags that the backend can store from the post content the user
 * typed. Hashtags are written inline (e.g. "hi #hacking"), so the tag list is
 * derived instead of entered separately.
 */
export function extractTags(content: string): string[] {
  const tags: string[] = []

  for (const match of content.matchAll(HASHTAG_REGEX)) {
    const tag = normalizeTag(match[0])
    if (!TAG_REGEX.test(tag) || tags.includes(tag)) continue
    tags.push(tag)
    if (tags.length === MAX_TAGS) break
  }

  return tags
}

export function normalizeUrl(input: string): string {
  let value = input.trim()
  if (!value) return ''
  value = value.replace(/^http:\/\//i, 'https://')
  if (!/^https?:\/\//i.test(value)) value = `https://${value}`
  return value
}

export function isHttpsUrl(input: string): boolean {
  if (!input) return true
  if (/\s/.test(input)) return false
  try {
    const url = new URL(input)
    return url.protocol === 'https:' && url.hostname.includes('.')
  } catch {
    return false
  }
}

export function isEmail(input: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.trim())
}

const SEARCH_TERM_MAX_LENGTH = 40

/**
 * Keeps only characters that are safe inside a PostgREST filter expression.
 * Commas, parentheses and quotes would otherwise change the meaning of the
 * `or=(...)` filter, so they are stripped instead of escaped.
 */
export function sanitizeSearchTerm(input: string): string {
  return input
    .trim()
    .replace(/[^\p{L}\p{N}\s_-]/gu, '')
    .replace(/\s+/g, ' ')
    .slice(0, SEARCH_TERM_MAX_LENGTH)
    .trim()
}
