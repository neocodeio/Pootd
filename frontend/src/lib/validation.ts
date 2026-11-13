export const USERNAME_REGEX = /^[a-z0-9_]{3,24}$/
export const TAG_REGEX = /^[a-z0-9][a-z0-9-]{0,23}$/

export function normalizeUsername(input: string): string {
  return input.trim().toLowerCase()
}

export function normalizeTag(input: string): string {
  return input.trim().toLowerCase().replace(/^#+/, '')
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
