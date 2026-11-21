import { describe, expect, it } from 'vitest'
import {
  CERTIFICATION_YEAR_MAX,
  EMPTY_CERTIFICATION,
  MAX_CERTIFICATIONS,
  MAX_EXPERTISE_LABEL_LENGTH,
  MAX_EXPERTISE_LABELS,
  normalizeDigits,
  parseCertifications,
  parseLabels,
  parseSkills,
  parseTools,
  prepareCertifications,
  prepareLabels,
} from './expertise'

describe('normalizeDigits', () => {
  it('maps Arabic-Indic and Extended Arabic-Indic digits to ASCII', () => {
    expect(normalizeDigits('٢٠٢٤')).toBe('2024')
    expect(normalizeDigits('۲۰۲۴')).toBe('2024')
    expect(normalizeDigits('سنة ١٩٩٩ م')).toBe('سنة 1999 م')
  })

  it('leaves ASCII text alone', () => {
    expect(normalizeDigits('2024')).toBe('2024')
    expect(normalizeDigits('CISSP')).toBe('CISSP')
  })
})

describe('parseLabels', () => {
  it('keeps clean labels and trims the whitespace', () => {
    expect(parseLabels(['  أمن الشبكات ', 'اختبار الاختراق'])).toEqual([
      'أمن الشبكات',
      'اختبار الاختراق',
    ])
  })

  it('folds runs of whitespace inside a label', () => {
    expect(parseLabels(['Burp   Suite'])).toEqual(['Burp Suite'])
  })

  it('drops blanks, non-strings and over-long labels', () => {
    const long = 'a'.repeat(MAX_EXPERTISE_LABEL_LENGTH + 1)

    expect(parseLabels(['', '   ', null, 42, { label: 'x' }, long, 'ok'])).toEqual([
      'ok',
    ])
  })

  it('removes case-insensitive duplicates and caps the list', () => {
    expect(parseLabels(['Wireshark', 'wireshark', 'Nmap'])).toEqual([
      'Wireshark',
      'Nmap',
    ])

    const labels = Array.from(
      { length: MAX_EXPERTISE_LABELS + 3 },
      (_, index) => `مهارة ${index}`,
    )
    expect(parseLabels(labels)).toHaveLength(MAX_EXPERTISE_LABELS)
  })

  it('returns an empty list for anything that is not an array', () => {
    expect(parseLabels(null)).toEqual([])
    expect(parseLabels(undefined)).toEqual([])
    expect(parseLabels('أمن')).toEqual([])
    expect(parseSkills(undefined)).toEqual([])
    expect(parseTools(undefined)).toEqual([])
  })
})

describe('parseCertifications', () => {
  it('keeps valid rows and normalizes an optional link', () => {
    expect(
      parseCertifications([
        {
          title: '  OSCP  ',
          issuer: ' Offensive Security ',
          year: '2024',
          url: 'example.com/cert',
        },
      ]),
    ).toEqual([
      {
        title: 'OSCP',
        issuer: 'Offensive Security',
        year: '2024',
        url: 'https://example.com/cert',
      },
    ])
  })

  it('drops invalid optional fields but keeps the award', () => {
    expect(
      parseCertifications([
        { title: 'CEH', issuer: 'x'.repeat(61), year: '24', url: 'javascript:alert(1)' },
      ]),
    ).toEqual([{ title: 'CEH', issuer: '', year: '', url: '' }])
  })

  it('skips rows without a usable title and junk entries', () => {
    expect(
      parseCertifications([
        null,
        'junk',
        { title: '   ' },
        { title: 'x'.repeat(61) },
        { title: 'eJPT' },
      ]),
    ).toEqual([{ title: 'eJPT', issuer: '', year: '', url: '' }])
  })

  it('caps the list and tolerates a missing column', () => {
    const rows = Array.from({ length: MAX_CERTIFICATIONS + 2 }, (_, index) => ({
      title: `شهادة ${index}`,
    }))

    expect(parseCertifications(rows)).toHaveLength(MAX_CERTIFICATIONS)
    expect(parseCertifications(undefined)).toEqual([])
    expect(parseCertifications({ title: 'OSCP' })).toEqual([])
  })

  it('drops a year outside the supported range', () => {
    const [row] = parseCertifications([
      { title: 'OSCP', year: String(CERTIFICATION_YEAR_MAX + 1) },
    ])
    expect(row.year).toBe('')
  })

  it('accepts Arabic-Indic digits in a year', () => {
    const [row] = parseCertifications([{ title: 'OSCP', year: '٢٠٢٤' }])
    expect(row.year).toBe('2024')
  })
})

describe('prepareLabels', () => {
  it('ignores blank drafts and trims what is left', () => {
    expect(prepareLabels(['', '  أمن الشبكات  ', '   '], 'المهارات')).toEqual({
      labels: ['أمن الشبكات'],
      error: null,
    })
  })

  it('rejects an over-long label', () => {
    const result = prepareLabels(
      ['a'.repeat(MAX_EXPERTISE_LABEL_LENGTH + 1)],
      'المهارات',
    )
    expect(result.error).toMatch(/المهارات/)
    expect(result.labels).toEqual([])
  })

  it('rejects a duplicate regardless of case', () => {
    const result = prepareLabels(['Wireshark', 'wireshark'], 'الأدوات')
    expect(result.error).toBe('الأدوات: «wireshark» مكرر.')
  })

  it('rejects more labels than the limit', () => {
    const rows = Array.from(
      { length: MAX_EXPERTISE_LABELS + 1 },
      (_, index) => `مهارة ${index}`,
    )
    expect(prepareLabels(rows, 'المهارات').error).toBe(
      `المهارات: الحد الأقصى ${MAX_EXPERTISE_LABELS} عناصر.`,
    )
  })
})

describe('prepareCertifications', () => {
  it('skips rows the member never filled', () => {
    expect(
      prepareCertifications([
        { ...EMPTY_CERTIFICATION },
        { ...EMPTY_CERTIFICATION, title: '  ' },
        { ...EMPTY_CERTIFICATION, title: 'OSCP', issuer: 'Offensive Security', year: '2024' },
      ]),
    ).toEqual({
      certifications: [
        {
          title: 'OSCP',
          issuer: 'Offensive Security',
          year: '2024',
          url: '',
        },
      ],
      error: null,
    })
  })

  it('requires a title as soon as a row has any content', () => {
    const result = prepareCertifications([
      { ...EMPTY_CERTIFICATION, issuer: 'Offensive Security' },
    ])
    expect(result.error).toBe('اسم الشهادة أو الإنجاز مطلوب.')
  })

  it('rejects an over-long title or issuer', () => {
    expect(
      prepareCertifications([{ ...EMPTY_CERTIFICATION, title: 'x'.repeat(61) }]).error,
    ).toMatch(/اسم الشهادة/)
    expect(
      prepareCertifications([
        { ...EMPTY_CERTIFICATION, title: 'OSCP', issuer: 'x'.repeat(61) },
      ]).error,
    ).toMatch(/جهة الإصدار/)
  })

  it('rejects a year that is not four digits between 1970 and 2100', () => {
    expect(
      prepareCertifications([
        { ...EMPTY_CERTIFICATION, title: 'OSCP', year: '24' },
      ]).error,
    ).toMatch(/السنة/)
    expect(
      prepareCertifications([
        { ...EMPTY_CERTIFICATION, title: 'OSCP', year: '1969' },
      ]).error,
    ).toMatch(/السنة/)
    expect(
      prepareCertifications([
        { ...EMPTY_CERTIFICATION, title: 'OSCP', year: '2100' },
      ]).error,
    ).toBeNull()
  })

  it('normalizes a bare link and rejects a broken one', () => {
    const ok = prepareCertifications([
      { ...EMPTY_CERTIFICATION, title: 'OSCP', url: 'example.com/cert' },
    ])
    expect(ok.error).toBeNull()
    expect(ok.certifications[0].url).toBe('https://example.com/cert')

    expect(
      prepareCertifications([
        { ...EMPTY_CERTIFICATION, title: 'OSCP', url: 'javascript:alert(1)' },
      ]).error,
    ).toMatch(/https/)
  })

  it('stores an Arabic-Indic year as ASCII digits', () => {
    const result = prepareCertifications([
      { ...EMPTY_CERTIFICATION, title: 'OSCP', year: '٢٠٢٤' },
    ])
    expect(result.error).toBeNull()
    expect(result.certifications[0].year).toBe('2024')
  })

  it('rejects more than six awards', () => {
    const rows = Array.from({ length: MAX_CERTIFICATIONS + 1 }, (_, index) => ({
      ...EMPTY_CERTIFICATION,
      title: `شهادة ${index}`,
    }))
    expect(prepareCertifications(rows).error).toBe(
      `الحد الأقصى ${MAX_CERTIFICATIONS} شهادات أو إنجازات.`,
    )
  })
})
