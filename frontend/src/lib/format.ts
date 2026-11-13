const arabicLocale = 'ar-SA-u-nu-latn-ca-gregory'

interface UnitForms {
  one: string
  two: string
  few: string
  many: string
}

function relative(value: number, forms: UnitForms): string {
  if (value === 1) return `قبل ${forms.one}`
  if (value === 2) return `قبل ${forms.two}`
  if (value <= 10) return `قبل ${value} ${forms.few}`
  return `قبل ${value} ${forms.many}`
}

const minuteForms: UnitForms = {
  one: 'دقيقة',
  two: 'دقيقتين',
  few: 'دقائق',
  many: 'دقيقة',
}

const hourForms: UnitForms = {
  one: 'ساعة',
  two: 'ساعتين',
  few: 'ساعات',
  many: 'ساعة',
}

const dayForms: UnitForms = {
  one: 'يوم',
  two: 'يومين',
  few: 'أيام',
  many: 'يوم',
}

export function timeAgo(iso: string): string {
  const date = new Date(iso)
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)

  if (seconds < 60) return 'الآن'

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return relative(minutes, minuteForms)

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return relative(hours, hourForms)

  const days = Math.floor(hours / 24)
  if (days < 7) return relative(days, dayForms)

  const sameYear = date.getFullYear() === new Date().getFullYear()
  return new Intl.DateTimeFormat(arabicLocale, {
    day: 'numeric',
    month: 'long',
    ...(sameYear ? {} : { year: 'numeric' }),
  }).format(date)
}

export function formatJoined(iso: string): string {
  return new Intl.DateTimeFormat(arabicLocale, {
    month: 'long',
    year: 'numeric',
  }).format(new Date(iso))
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat(arabicLocale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso))
}

function compact(value: number, divisor: number): string {
  const scaled = value / divisor
  return scaled.toFixed(scaled < 10 ? 1 : 0).replace(/\.0$/, '')
}

export function formatCount(value: number): string {
  if (value < 1000) return String(value)
  if (value < 995_000) return `${compact(value, 1000)} ألف`
  if (value < 995_000_000) return `${compact(value, 1_000_000)} مليون`
  return `${compact(value, 1_000_000_000)} مليار`
}

export function postsLabel(count: number): string {
  if (count === 0) return 'لا منشورات'
  if (count === 1) return 'منشور واحد'
  if (count === 2) return 'منشوران'
  if (count <= 10) return `${count} منشورات`
  if (count < 100) return `${count} منشورًا`
  return `${formatCount(count)} منشور`
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '؟؟'
  if (parts.length === 1) {
    return Array.from(parts[0]).slice(0, 2).join('').toUpperCase()
  }
  const first = Array.from(parts[0])[0] ?? ''
  const last = Array.from(parts[parts.length - 1])[0] ?? ''
  return `${first}${last}`.toUpperCase()
}

export function safeHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url.replace(/^https?:\/\//, '').replace(/\/$/, '')
  }
}
