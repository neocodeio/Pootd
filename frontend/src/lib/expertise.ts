import type { Certification } from './types'
import { isHttpsUrl, normalizeUrl } from './validation'

/** The limits below are mirrored by `0020_profile_expertise.sql`. */
export const MAX_EXPERTISE_LABELS = 12
export const MAX_EXPERTISE_LABEL_LENGTH = 30
export const MAX_CERTIFICATIONS = 6
export const MAX_CERTIFICATION_TITLE = 60
export const MAX_CERTIFICATION_ISSUER = 60
export const CERTIFICATION_YEAR_MIN = 1970
export const CERTIFICATION_YEAR_MAX = 2100
export const MAX_CERTIFICATION_URL = 2048

/** A blank row for the settings editor; spread it, never mutate it. */
export const EMPTY_CERTIFICATION: Certification = {
  title: '',
  issuer: '',
  year: '',
  url: '',
}

/** Arabic-Indic and Extended Arabic-Indic digits → ASCII, so ٢٠٢٤ works. */
export function normalizeDigits(input: string): string {
  return input.replace(/[\u0660-\u0669\u06F0-\u06F9]/g, (digit) => {
    const code = digit.charCodeAt(0)
    return String(code >= 0x06f0 ? code - 0x06f0 : code - 0x0660)
  })
}

/** SQL `char_length` counts characters, not UTF-16 units. */
function charLength(value: string): number {
  return [...value].length
}

/** Trims and folds runs of whitespace so "Burp   Suite" is one clean label. */
function cleanLabel(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

function sameLabel(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase()
}

/** A valid four-digit year inside the allowed range, or an empty string. */
function cleanYear(value: unknown): string {
  if (typeof value !== 'string' && typeof value !== 'number') return ''
  const year = normalizeDigits(String(value)).trim()
  if (!/^\d{4}$/.test(year)) return ''
  const number = Number(year)
  return number >= CERTIFICATION_YEAR_MIN && number <= CERTIFICATION_YEAR_MAX ? year : ''
}

/** An optional certificate link; anything that is not a safe https URL is dropped. */
function cleanCertificationUrl(value: unknown): string {
  if (typeof value !== 'string') return ''
  const url = normalizeUrl(value)
  if (!url || url.length > MAX_CERTIFICATION_URL) return ''
  return isHttpsUrl(url) ? url : ''
}

/**
 * Normalizes whatever the database returns into the labels we can render:
 * strings only, trimmed, no blanks, no over-long entries, no case-insensitive
 * duplicates, twelve at most. Junk is dropped instead of thrown, so a profile
 * keeps rendering before the migration adds the columns.
 */
export function parseLabels(value: unknown): string[] {
  if (!Array.isArray(value)) return []

  const labels: string[] = []

  for (const entry of value) {
    if (typeof entry !== 'string') continue
    const label = cleanLabel(entry)
    if (!label || charLength(label) > MAX_EXPERTISE_LABEL_LENGTH) continue
    if (labels.some((existing) => sameLabel(existing, label))) continue

    labels.push(label)
    if (labels.length === MAX_EXPERTISE_LABELS) break
  }

  return labels
}

/** Skills and areas of expertise, same rules as every label list. */
export function parseSkills(value: unknown): string[] {
  return parseLabels(value)
}

/** Tools the member works with, same rules as every label list. */
export function parseTools(value: unknown): string[] {
  return parseLabels(value)
}

/**
 * Certifications and achievements from the database: a title is required, the
 * issuer, year and link are optional, and an invalid optional field is dropped
 * without hiding the whole entry.
 */
export function parseCertifications(value: unknown): Certification[] {
  if (!Array.isArray(value)) return []

  const certifications: Certification[] = []

  for (const entry of value) {
    if (!entry || typeof entry !== 'object') continue
    const row = entry as Record<string, unknown>

    const title =
      typeof row.title === 'string' ? cleanLabel(row.title) : ''
    if (!title || charLength(title) > MAX_CERTIFICATION_TITLE) continue

    const issuer =
      typeof row.issuer === 'string' ? cleanLabel(row.issuer) : ''
    const url = cleanCertificationUrl(row.url)

    certifications.push({
      title,
      issuer: charLength(issuer) <= MAX_CERTIFICATION_ISSUER ? issuer : '',
      year: cleanYear(row.year),
      url,
    })
    if (certifications.length === MAX_CERTIFICATIONS) break
  }

  return certifications
}

/**
 * Validates the skill/tool editor before saving. Empty drafts are ignored so an
 * untouched input never blocks the form.
 */
export function prepareLabels(
  rows: readonly string[],
  field: string,
): { labels: string[]; error: string | null } {
  const labels: string[] = []

  for (const row of rows) {
    const label = cleanLabel(row)
    if (!label) continue

    if (charLength(label) > MAX_EXPERTISE_LABEL_LENGTH) {
      return {
        labels,
        error: `${field}: كل عنصر لازم يكون ${MAX_EXPERTISE_LABEL_LENGTH} حرفًا أو أقل.`,
      }
    }
    if (labels.some((existing) => sameLabel(existing, label))) {
      return { labels, error: `${field}: «${label}» مكرر.` }
    }

    labels.push(label)
  }

  if (labels.length > MAX_EXPERTISE_LABELS) {
    return {
      labels,
      error: `${field}: الحد الأقصى ${MAX_EXPERTISE_LABELS} عناصر.`,
    }
  }

  return { labels, error: null }
}

/**
 * Validates the certification rows before saving. A row with every field blank
 * is ignored; a row with any content must have a title.
 */
export function prepareCertifications(
  rows: readonly Certification[],
): { certifications: Certification[]; error: string | null } {
  const certifications: Certification[] = []

  for (const row of rows) {
    const title = cleanLabel(row.title ?? '')
    const issuer = cleanLabel(row.issuer ?? '')
    const year = normalizeDigits(String(row.year ?? '')).trim()
    const url = normalizeUrl(row.url ?? '')

    if (!title && !issuer && !year && !url) continue

    if (!title) {
      return { certifications, error: 'اسم الشهادة أو الإنجاز مطلوب.' }
    }
    if (charLength(title) > MAX_CERTIFICATION_TITLE) {
      return {
        certifications,
        error: `اسم الشهادة لازم يكون ${MAX_CERTIFICATION_TITLE} حرفًا أو أقل.`,
      }
    }
    if (charLength(issuer) > MAX_CERTIFICATION_ISSUER) {
      return {
        certifications,
        error: `جهة الإصدار لازم تكون ${MAX_CERTIFICATION_ISSUER} حرفًا أو أقل.`,
      }
    }
    if (year && cleanYear(year) !== year) {
      return {
        certifications,
        error: `السنة لازم تكون أربعة أرقام بين ${CERTIFICATION_YEAR_MIN} و${CERTIFICATION_YEAR_MAX}.`,
      }
    }
    if (url && (url.length > MAX_CERTIFICATION_URL || !isHttpsUrl(url))) {
      return {
        certifications,
        error: 'رابط الشهادة لازم يكون رابط https:// صحيح.',
      }
    }

    certifications.push({ title, issuer, year, url })
  }

  if (certifications.length > MAX_CERTIFICATIONS) {
    return {
      certifications,
      error: `الحد الأقصى ${MAX_CERTIFICATIONS} شهادات أو إنجازات.`,
    }
  }

  return { certifications, error: null }
}
