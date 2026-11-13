import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Loader2, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { OtpApiError, resendOtp, verifyEmailOtp } from '@/lib/otp-api'

interface OtpVerificationProps {
  email: string
  userId?: string
  initialResendAfterSeconds?: number
  onVerified: (userId: string) => void | Promise<void>
}

export function OtpVerification({
  email,
  userId,
  initialResendAfterSeconds = 60,
  onVerified,
}: OtpVerificationProps) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [pending, setPending] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendIn, setResendIn] = useState(initialResendAfterSeconds)

  useEffect(() => {
    if (resendIn <= 0) return
    const timer = window.setTimeout(() => setResendIn(resendIn - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [resendIn])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setNotice('')

    if (!/^\d{4}$/.test(code)) {
      setError('أدخل الرمز المكوّن من 4 أرقام.')
      return
    }

    setPending(true)
    try {
      const result = await verifyEmailOtp({ email, code })
      await onVerified(result.userId)
    } catch (unknownError) {
      if (
        unknownError instanceof OtpApiError &&
        unknownError.code === 'OTP_INVALID' &&
        typeof unknownError.attemptsRemaining === 'number'
      ) {
        setError(`${unknownError.message} باقي ${unknownError.attemptsRemaining} محاولات.`)
      } else {
        setError(
          unknownError instanceof Error ? unknownError.message : 'حدث خطأ غير متوقع.',
        )
      }
    } finally {
      setPending(false)
    }
  }

  async function handleResend() {
    if (resendIn > 0 || resending) return

    setError('')
    setNotice('')
    setResending(true)

    try {
      const result = await resendOtp({ email, userId })
      setCode('')
      setResendIn(result.resendAfterSeconds)
      setNotice('أرسلنا رمزًا جديدًا. تحقق من بريدك.')
    } catch (unknownError) {
      if (
        unknownError instanceof OtpApiError &&
        typeof unknownError.retryAfterSeconds === 'number'
      ) {
        setResendIn(unknownError.retryAfterSeconds)
      }
      setError(
        unknownError instanceof Error
          ? unknownError.message
          : 'تعذر إعادة إرسال الرمز.',
      )
    } finally {
      setResending(false)
    }
  }

  return (
    <div>
      <div className="mb-6">
        <div className="mb-4 flex size-11 items-center justify-center rounded-2xl bg-secondary">
          <ShieldCheck className="size-5" />
        </div>
        <h1 className="font-heading text-xl font-semibold tracking-tight">أكّد بريدك.</h1>
        <p className="mt-2 text-sm leading-7 text-muted-foreground">
          أرسلنا رمز تحقق من 4 أرقام إلى{' '}
          <span dir="ltr" className="font-medium text-foreground">
            {email}
          </span>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="otp-code">رمز التحقق</Label>
          <Input
            id="otp-code"
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 4))}
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={4}
            dir="ltr"
            className="h-14 text-center font-mono text-2xl tracking-[0.6em]"
            placeholder="0000"
            autoFocus
          />
          <p className="text-xs leading-6 text-muted-foreground">
            الرمز صالح لمدة 10 دقائق. لا تشاركه مع أي أحد.
          </p>
        </div>

        {error ? (
          <p
            role="alert"
            className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </p>
        ) : null}

        {notice ? (
          <p
            role="status"
            className="rounded-xl border border-border bg-secondary/60 px-3 py-2 text-sm text-foreground/80"
          >
            {notice}
          </p>
        ) : null}

        <Button type="submit" disabled={pending || code.length !== 4} className="w-full">
          {pending ? <Loader2 className="animate-spin" /> : null}
          تحقق من الرمز
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={handleResend}
          disabled={resending || resendIn > 0}
          className="w-full"
        >
          {resending ? <Loader2 className="animate-spin" /> : null}
          {resendIn > 0 ? `إعادة الإرسال بعد ${resendIn} ثانية` : 'إعادة إرسال الرمز'}
        </Button>
      </form>
    </div>
  )
}
