export interface MentionToken {
  /** What the author has typed after the `@`. */
  query: string
  /** Index of the `@`. */
  start: number
  /** Caret position when the token was read. */
  end: number
}

/**
 * Mirrors the renderer's rule: `@` must follow a non-word boundary, and only
 * Latin letters, digits and underscores can form a username — so an e-mail
 * such as `name@example.com` never opens the suggestion list.
 */
const MENTION_BEFORE_CARET = /(^|[^\w@])@([A-Za-z0-9_]{0,24})$/

/** The `@username` fragment the caret currently sits at the end of, if any. */
export function activeMention(
  value: string,
  caret: number,
): MentionToken | null {
  const safeCaret = Math.max(0, Math.min(caret, value.length))
  const match = MENTION_BEFORE_CARET.exec(value.slice(0, safeCaret))
  if (!match) return null

  const query = match[2]
  return {
    query,
    start: safeCaret - query.length - 1,
    end: safeCaret,
  }
}

/**
 * Replaces the active `@fragment` with the chosen username and keeps the caret
 * after it, so the author can carry on typing.
 */
export function applyMention(
  value: string,
  token: MentionToken,
  username: string,
): { value: string; caret: number } {
  const after = value.slice(token.end)
  const spacer = after.startsWith(' ') ? '' : ' '
  const head = `${value.slice(0, token.start)}@${username}`
  const next = `${head}${spacer}${after}`

  return { value: next, caret: head.length + spacer.length }
}
