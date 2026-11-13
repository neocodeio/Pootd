export class OtpApiError extends Error {
  readonly code: string
  readonly status: number
  readonly retryAfterSeconds?: number
  readonly attemptsRemaining?: number

  constructor(
    code: string,
    message: string,
    status: number,
    details: { retryAfterSeconds?: number; attemptsRemaining?: number } = {},
  ) {
    super(message)
    this.name = 'OtpApiError'
    this.code = code
    this.status = status
    this.retryAfterSeconds = details.retryAfterSeconds
    this.attemptsRemaining = details.attemptsRemaining
  }
}

interface ApiErrorPayload {
  error?: {
    code?: string
    message?: string
    retryAfterSeconds?: number
    attemptsRemaining?: number
  }
}

const configuredBase = import.meta.env.VITE_API_URL?.trim()
const fallbackBase = import.meta.env.DEV ? 'http://localhost:3000' : ''

function getApiBase(): string {
  const base = configuredBase || fallbackBase
  if (!base) {
    throw new OtpApiError(
      'API_NOT_CONFIGURED',
      'خدمة التحقق غير مهيأة. تواصل مع إدارة الموقع.',
      0,
    )
  }
  return base.replace(/\/+$/, '')
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const base = getApiBase()
  let response: Response

  try {
    response = await fetch(`${base}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    throw new OtpApiError(
      'NETWORK_ERROR',
      'تعذر الاتصال بخادم التحقق. تأكد من تشغيله وحاول مرة ثانية.',
      0,
    )
  }

  const payload = (await response.json().catch(() => null)) as
    | (T & ApiErrorPayload)
    | null

  if (!response.ok) {
    const error = payload?.error
    throw new OtpApiError(
      error?.code ?? 'SERVER_ERROR',
      error?.message ?? 'حدث خطأ غير متوقع. حاول مرة ثانية.',
      response.status,
      {
        retryAfterSeconds: error?.retryAfterSeconds,
        attemptsRemaining: error?.attemptsRemaining,
      },
    )
  }

  if (!payload) {
    throw new OtpApiError('SERVER_ERROR', 'استجابة غير صالحة من خادم التحقق.', response.status)
  }

  return payload
}

export interface StartSignupInput {
  displayName: string
  username: string
  email: string
  password: string
}

export interface StartSignupResult {
  userId: string
  email: string
  resendAfterSeconds: number
}

export function startSignup(input: StartSignupInput): Promise<StartSignupResult> {
  return post<StartSignupResult>('/api/auth/signup', input)
}

export function resendOtp(input: {
  email: string
  userId?: string
}): Promise<{ ok: true; resendAfterSeconds: number }> {
  return post<{ ok: true; resendAfterSeconds: number }>('/api/auth/otp/resend', input)
}

export function verifyEmailOtp(input: {
  email: string
  code: string
}): Promise<{ ok: true; userId: string }> {
  return post<{ ok: true; userId: string }>('/api/auth/otp/verify', input)
}
