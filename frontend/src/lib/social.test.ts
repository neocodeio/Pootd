import { describe, expect, it } from 'vitest'
import { MAX_SOCIAL_LINKS, parseSocialLinks, prepareSocialLinks, socialLinkProblem } from './social'

describe('socialLinkProblem', () => {
  it('accepts valid links on the platform domains', () => {
    expect(socialLinkProblem('x', 'https://x.com/amin')).toBeNull()
    expect(socialLinkProblem('x', 'https://www.twitter.com/amin')).toBeNull()
    expect(socialLinkProblem('github', 'https://github.com/neocodeio')).toBeNull()
    expect(socialLinkProblem('telegram', 'https://t.me/amin')).toBeNull()
    expect(socialLinkProblem('youtube', 'https://youtu.be/abc')).toBeNull()
  })

  it('upgrades a bare or http link to https', () => {
    expect(socialLinkProblem('github', 'github.com/neocodeio')).toBeNull()
    expect(socialLinkProblem('github', 'http://github.com/neocodeio')).toBeNull()
  })

  it('rejects a link that is not on the platform domain', () => {
    expect(socialLinkProblem('github', 'https://gitlab.com/amin')).toMatch(/github\.com/)
    expect(socialLinkProblem('github', 'https://github.com.evil.test/amin')).toMatch(
      /github\.com/,
    )
    expect(socialLinkProblem('x', 'https://example.com/x.com')).toMatch(/x\.com/)
  })

  it('rejects empty and broken links', () => {
    expect(socialLinkProblem('x', '')).not.toBeNull()
    expect(socialLinkProblem('x', 'https://')).not.toBeNull()
    expect(socialLinkProblem('x', 'https://x.com/a b')).not.toBeNull()
  })

  it('rejects an over-long link', () => {
    const long = `https://github.com/${'a'.repeat(2048)}`
    expect(socialLinkProblem('github', long)).toBe('الرابط طويل جدًا.')
  })
})

describe('parseSocialLinks', () => {
  it('keeps only valid entries, one per platform, capped at three', () => {
    const links = parseSocialLinks([
      { platform: 'github', url: 'https://github.com/amin' },
      { platform: 'github', url: 'https://github.com/other' },
      { platform: 'x', url: 'https://x.com/amin' },
      { platform: 'instagram', url: 'https://instagram.com/amin' },
      { platform: 'telegram', url: 'https://t.me/amin' },
      { platform: 'linkedin', url: 'https://evil.test/amin' },
      { platform: 'myspace', url: 'https://myspace.com/amin' },
      'junk',
      null,
    ])

    expect(links).toEqual([
      { platform: 'github', url: 'https://github.com/amin' },
      { platform: 'x', url: 'https://x.com/amin' },
      { platform: 'instagram', url: 'https://instagram.com/amin' },
    ])
    expect(links).toHaveLength(MAX_SOCIAL_LINKS)
  })

  it('returns an empty list for anything that is not an array', () => {
    expect(parseSocialLinks(null)).toEqual([])
    expect(parseSocialLinks(undefined)).toEqual([])
    expect(parseSocialLinks('[]')).toEqual([])
    expect(parseSocialLinks({ platform: 'x', url: 'https://x.com/amin' })).toEqual([])
  })
})

describe('prepareSocialLinks', () => {
  it('drops empty rows instead of failing the form', () => {
    expect(
      prepareSocialLinks([
        { platform: 'x', url: '' },
        { platform: 'github', url: 'https://github.com/neocodeio' },
        { platform: 'telegram', url: '   ' },
      ]),
    ).toEqual({
      links: [{ platform: 'github', url: 'https://github.com/neocodeio' }],
      error: null,
    })
  })

  it('reports the platform when a URL belongs to another site', () => {
    const result = prepareSocialLinks([
      { platform: 'linkedin', url: 'https://github.com/neocodeio' },
    ])
    expect(result.error).toMatch(/LinkedIn/)
  })

  it('rejects the same platform twice', () => {
    const result = prepareSocialLinks([
      { platform: 'x', url: 'https://x.com/one' },
      { platform: 'x', url: 'https://twitter.com/two' },
    ])
    expect(result.error).toBe('كل منصة مرة واحدة فقط.')
  })

  it('reports more than three accounts', () => {
    const rows = [
      { platform: 'x' as const, url: 'https://x.com/one' },
      { platform: 'github' as const, url: 'https://github.com/two' },
      { platform: 'instagram' as const, url: 'https://instagram.com/three' },
      { platform: 'youtube' as const, url: 'https://youtube.com/@four' },
    ]
    expect(prepareSocialLinks(rows).error).toBe('الحد الأقصى 3 حسابات.')
  })
})
