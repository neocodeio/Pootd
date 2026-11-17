import { describe, expect, it } from 'vitest'
import { formatCount, initials, postsLabel, safeHostname } from './format'

describe('formatCount', () => {
  it('keeps small numbers as they are', () => {
    expect(formatCount(0)).toBe('0')
    expect(formatCount(999)).toBe('999')
  })

  it('compacts thousands and millions in Arabic', () => {
    expect(formatCount(1000)).toBe('1 ألف')
    expect(formatCount(1500)).toBe('1.5 ألف')
    expect(formatCount(1_000_000)).toBe('1 مليون')
  })
})

describe('postsLabel', () => {
  it('uses the right Arabic plural form', () => {
    expect(postsLabel(0)).toBe('لا منشورات')
    expect(postsLabel(1)).toBe('منشور واحد')
    expect(postsLabel(2)).toBe('منشوران')
    expect(postsLabel(3)).toBe('3 منشورات')
    expect(postsLabel(11)).toBe('11 منشورًا')
    expect(postsLabel(100)).toBe('100 منشور')
  })
})

describe('initials', () => {
  it('takes the first and last initial', () => {
    expect(initials('Amin Fahad')).toBe('AF')
    expect(initials('Amin')).toBe('AM')
    expect(initials('   ')).toBe('؟؟')
  })
})

describe('safeHostname', () => {
  it('returns a clean host and tolerates bad input', () => {
    expect(safeHostname('https://www.example.com/path')).toBe('example.com')
    expect(safeHostname('not a url')).toBe('not a url')
  })
})
