// Accounts that carry the verification badge. The badge is rendered next to
// the display name wherever a profile appears, so this list is the single
// source of truth; add a username here to verify that account.
const VERIFIED_USERNAMES = new Set(['amin'])

export function isVerified(username: string | undefined | null): boolean {
  return Boolean(username && VERIFIED_USERNAMES.has(username.toLowerCase()))
}
