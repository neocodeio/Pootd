import {
  GithubIcon,
  InstagramIcon,
  Linkedin01Icon,
  NewTwitterIcon,
  TelegramIcon,
  YoutubeIcon,
} from '@hugeicons/core-free-icons'
import type { IconSvgElement } from '@hugeicons/react'
import type { SocialLink, SocialPlatform } from '@/lib/types'
import { normalizeUrl } from '@/lib/validation'

/** A profile can show at most three social accounts. */
export const MAX_SOCIAL_LINKS = 3

interface SocialPlatformConfig {
  label: string
  /** Domains the account URL may live on (subdomains included). */
  hosts: readonly string[]
  icon: IconSvgElement
  placeholder: string
}

export const SOCIAL_PLATFORMS: Record<SocialPlatform, SocialPlatformConfig> = {
  x: {
    label: 'X',
    hosts: ['x.com', 'twitter.com'],
    icon: NewTwitterIcon,
    placeholder: 'https://x.com/username',
  },
  github: {
    label: 'GitHub',
    hosts: ['github.com'],
    icon: GithubIcon,
    placeholder: 'https://github.com/username',
  },
  linkedin: {
    label: 'LinkedIn',
    hosts: ['linkedin.com'],
    icon: Linkedin01Icon,
    placeholder: 'https://linkedin.com/in/username',
  },
  instagram: {
    label: 'إنستقرام',
    hosts: ['instagram.com'],
    icon: InstagramIcon,
    placeholder: 'https://instagram.com/username',
  },
  telegram: {
    label: 'تيليجرام',
    hosts: ['t.me', 'telegram.me'],
    icon: TelegramIcon,
    placeholder: 'https://t.me/username',
  },
  youtube: {
    label: 'يوتيوب',
    hosts: ['youtube.com', 'youtu.be'],
    icon: YoutubeIcon,
    placeholder: 'https://youtube.com/@username',
  },
}

export const SOCIAL_PLATFORM_ORDER: SocialPlatform[] = [
  'x',
  'github',
  'linkedin',
  'instagram',
  'telegram',
  'youtube',
]

export function isSocialPlatform(value: string): value is SocialPlatform {
  return Object.prototype.hasOwnProperty.call(SOCIAL_PLATFORMS, value)
}

function parseHttpsUrl(value: string): URL | null {
  if (!value || /\s/.test(value)) return null

  try {
    const url = new URL(value)
    return url.protocol === 'https:' ? url : null
  } catch {
    return null
  }
}

function hostAllowed(hostname: string, hosts: readonly string[]): boolean {
  const host = hostname.toLowerCase().replace(/^www\./, '')
  return hosts.some((allowed) => host === allowed || host.endsWith(`.${allowed}`))
}

/**
 * Returns the Arabic error for a platform URL, or `null` when the URL is a
 * valid https link on one of that platform's domains.
 */
export function socialLinkProblem(
  platform: SocialPlatform,
  input: string,
): string | null {
  const config = SOCIAL_PLATFORMS[platform]
  const url = parseHttpsUrl(normalizeUrl(input))

  if (!url) return `أضف رابط ${config.label} بشكل صحيح (https://).`
  if (url.href.length > 2048) return 'الرابط طويل جدًا.'
  if (!hostAllowed(url.hostname, config.hosts)) {
    return `رابط ${config.label} لازم يكون من ${config.hosts[0]}.`
  }

  return null
}

/**
 * Normalizes whatever the database returns into links we can render: known
 * platforms only, https only, the right domain per platform, one entry per
 * platform, three at most. Junk rows are dropped instead of thrown.
 */
export function parseSocialLinks(value: unknown): SocialLink[] {
  if (!Array.isArray(value)) return []

  const links: SocialLink[] = []

  for (const entry of value) {
    if (!entry || typeof entry !== 'object') continue
    const platform = (entry as { platform?: unknown }).platform
    const url = (entry as { url?: unknown }).url
    if (typeof platform !== 'string' || typeof url !== 'string') continue
    if (!isSocialPlatform(platform)) continue
    if (socialLinkProblem(platform, url) !== null) continue
    if (links.some((link) => link.platform === platform)) continue

    links.push({ platform, url: normalizeUrl(url) })
    if (links.length === MAX_SOCIAL_LINKS) break
  }

  return links
}

/**
 * Validates the settings rows before saving. Rows without a URL are ignored so
 * an "add account" row the user never filled does not block the form.
 */
export function prepareSocialLinks(
  rows: readonly SocialLink[],
): { links: SocialLink[]; error: string | null } {
  const links: SocialLink[] = []

  for (const row of rows) {
    const url = normalizeUrl(row.url)
    if (!url) continue

    const problem = socialLinkProblem(row.platform, url)
    if (problem) return { links, error: problem }
    if (links.some((link) => link.platform === row.platform)) {
      return { links, error: 'كل منصة مرة واحدة فقط.' }
    }

    links.push({ platform: row.platform, url })
  }

  if (links.length > MAX_SOCIAL_LINKS) {
    return { links, error: `الحد الأقصى ${MAX_SOCIAL_LINKS} حسابات.` }
  }

  return { links, error: null }
}
