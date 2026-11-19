import { describe, expect, it } from 'vitest'
import {
  buildShareTargets,
  buildShareText,
  buildShareTitle,
  shareExcerpt,
  SHARE_EXCERPT_LENGTH,
} from './share'

const post = {
  id: 'abc',
  content: 'مرحبًا بكم في Pootd\nمنصة عربية للأمن السيبراني',
  author: { display_name: 'أمين', username: 'amin' },
}
const url = 'https://pootd.app/p/abc'

describe('shareExcerpt', () => {
  it('collapses whitespace and keeps short content intact', () => {
    expect(shareExcerpt('  سطر أول\n\nسطر   ثاني  ')).toBe('سطر أول سطر ثاني')
  })

  it('cuts long content on a word boundary with an ellipsis', () => {
    const content = `${'كلمة '.repeat(40)}النهاية`
    const excerpt = shareExcerpt(content, 60)
    expect(excerpt.endsWith('…')).toBe(true)
    expect(excerpt.length).toBeLessThanOrEqual(61)
  })

  it('truncates a single long word without breaking the limit', () => {
    const excerpt = shareExcerpt('x'.repeat(500), 30)
    expect(excerpt).toBe(`${'x'.repeat(30)}…`)
  })

  it('defaults to the shared excerpt length', () => {
    const excerpt = shareExcerpt('ا'.repeat(400))
    expect(excerpt.length).toBe(SHARE_EXCERPT_LENGTH + 1)
  })
})

describe('buildShareText and buildShareTitle', () => {
  it('quotes the post and credits its author', () => {
    expect(buildShareText(post)).toBe(
      '«مرحبًا بكم في Pootd منصة عربية للأمن السيبراني» — أمين (@amin) على Pootd',
    )
  })

  it('falls back to the username when the display name is blank', () => {
    const text = buildShareText({
      ...post,
      author: { display_name: '   ', username: 'khalid' },
    })
    expect(text).toContain('(@khalid)')
    expect(text).toContain('— @khalid')
  })

  it('keeps the title short', () => {
    const title = buildShareTitle(post)
    expect(title).toMatch(/^«.*» — أمين على Pootd$/)
    expect(title.length).toBeLessThan(140)
  })
})

describe('buildShareTargets', () => {
  const targets = buildShareTargets(post, url)
  const byId = Object.fromEntries(targets.map((target) => [target.id, target]))
  const text = buildShareText(post)

  it('offers the approved platforms only', () => {
    expect(targets.map((target) => target.id)).toEqual(['x', 'telegram', 'reddit'])
    expect(targets.every((target) => target.icon.length > 0)).toBe(true)
  })

  it('builds an X intent with text and url', () => {
    const href = new URL(byId.x.href)
    expect(href.origin).toBe('https://x.com')
    expect(href.searchParams.get('text')).toBe(text)
    expect(href.searchParams.get('url')).toBe(url)
  })

  it('builds a Telegram share with text and url', () => {
    const telegram = new URL(byId.telegram.href)
    expect(telegram.searchParams.get('url')).toBe(url)
    expect(telegram.searchParams.get('text')).toBe(text)
  })

  it('builds a Reddit submission with title and url', () => {
    const href = new URL(byId.reddit.href)
    expect(href.searchParams.get('url')).toBe(url)
    expect(href.searchParams.get('title')).toBe(buildShareTitle(post))
  })

  it('encodes Arabic and reserved characters safely', () => {
    const arabic = buildShareTargets(
      { ...post, content: 'اختبار #أمن_سيبراني & أكثر' },
      'https://pootd.app/p/abc?x=1&y=2#comments',
    )
    for (const target of arabic) {
      expect(target.href).not.toMatch(/[\u0600-\u06FF]/)
    }
    expect(new URL(arabic[0].href).searchParams.get('url')).toBe(
      'https://pootd.app/p/abc?x=1&y=2#comments',
    )
  })
})
