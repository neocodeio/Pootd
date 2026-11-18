import { describe, expect, it } from 'vitest'
import {
  extractMentions,
  extractTags,
  normalizeArabic,
  normalizeSearchTerm,
  sanitizeSearchTerm,
} from './validation'

describe('extractTags', () => {
  it('extracts Latin hashtags and normalizes their case', () => {
    expect(extractTags('هجوم #Hacking على #web-sec')).toEqual([
      'hacking',
      'web-sec',
    ])
  })

  it('drops Arabic hashtags the database cannot store', () => {
    expect(extractTags('#أمن #اختراق')).toEqual([])
  })

  it('keeps each tag once and stops at five', () => {
    expect(extractTags('#a #a #b #c #d #e #f')).toEqual([
      'a',
      'b',
      'c',
      'd',
      'e',
    ])
  })

  it('ignores hashtags glued to words or hidden in URLs', () => {
    expect(extractTags('abc#def')).toEqual([])
    expect(extractTags('http://example.com/#frag')).toEqual([])
  })
})

describe('extractMentions', () => {
  it('extracts distinct usernames and lowercases them', () => {
    expect(extractMentions('راجع @Amin و @amin و@security_1')).toEqual([
      'amin',
      'security_1',
    ])
  })

  it('does not treat an email address as a mention', () => {
    expect(extractMentions('راسلني على name@example.com')).toEqual([])
  })

  it('ignores handles shorter than three characters', () => {
    expect(extractMentions('@ab @abc')).toEqual(['abc'])
  })
})

describe('normalizeArabic', () => {
  it('folds hamza seats, alef maqsura and taa marbuta', () => {
    expect(normalizeArabic('أمن')).toBe('امن')
    expect(normalizeArabic('الأمن السيبراني')).toBe('الامن السيبراني')
    expect(normalizeArabic('مسألة')).toBe('مساله')
    expect(normalizeArabic('مصطفى')).toBe('مصطفي')
    expect(normalizeArabic('مؤسسة')).toBe('موسسه')
    expect(normalizeArabic('مسؤول')).toBe('مسوول')
    expect(normalizeArabic('شاطئ')).toBe('شاطي')
    expect(normalizeArabic('هدى')).toBe('هدي')
  })

  it('removes tashkeel and tatweel', () => {
    expect(normalizeArabic('شخصٌ')).toBe('شخص')
    expect(normalizeArabic('مُخترِق')).toBe('مخترق')
    expect(normalizeArabic('أمـــــن')).toBe('امن')
  })

  it('collapses whitespace and lowercases Latin text', () => {
    expect(normalizeArabic('  أمن   و سلام ')).toBe('امن و سلام')
    expect(normalizeArabic('SQL Injection')).toBe('sql injection')
  })
})

describe('sanitizeSearchTerm', () => {
  it('strips characters that would break a PostgREST filter', () => {
    expect(sanitizeSearchTerm('a,b(c)"d"')).toBe('abcd')
    expect(sanitizeSearchTerm('  أمن   سيبراني  ')).toBe('أمن سيبراني')
  })
})

describe('normalizeSearchTerm', () => {
  it('sanitizes and folds in one step', () => {
    expect(normalizeSearchTerm('أمن, سيبراني')).toBe('امن سيبراني')
  })
})
