import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { AuthLayout } from '@/components/auth/auth-layout'
import { OtpVerification } from '@/components/auth/otp-verification'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { isEmail } from '@/lib/validation'

export function VerifyPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const initialEmail = searchParams.get('email')?.trim() ?? ''
  const validInitialEmail = isEmail(initialEmail) ? initialEmail : ''
  const [email, setEmail] = useState(validInitialEmail)
  const [emailInput, setEmailInput] = useState(validInitialEmail)
  const [error, setError] = useState('')

  function handleEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const cleanEmail = emailInput.trim()

    if (!isEmail(cleanEmail)) {
      setError('أدخل بريدًا إلكترونيًا صحيحًا.')
      return
    }

    setError('')
    setEmail(cleanEmail)
    navigate(`/verify?email=${encodeURIComponent(cleanEmail)}`, { replace: true })
  }

  if (!email) {
    return (
      <AuthLayout>
        <div className="mb-6">
          <h1 className="font-heading text-xl font-semibold tracking-tight">أكّد بريدك.</h1>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            أدخل بريدك الإلكتروني عشان نتحقق من رمز التسجيل.
          </p>
        </div>

        <form onSubmit={handleEmailSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="verify-email">البريد الإلكتروني</Label>
            <Input
              id="verify-email"
              type="email"
              value={emailInput}
              onChange={(event) => setEmailInput(event.target.value)}
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="you@example.com"
              dir="ltr"
              className="text-start"
            />
          </div>

          {error ? (
            <p
              role="alert"
              className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {error}
            </p>
          ) : null}

          <Button type="submit" className="w-full">
            متابعة
          </Button>
        </form>

        <p className="mt-6 border-t border-border pt-4 text-center text-sm text-muted-foreground">
          <Link
            to="/login"
            className="font-medium text-foreground underline underline-offset-4 transition-colors hover:text-foreground/80"
          >
            العودة لتسجيل الدخول
          </Link>
        </p>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <OtpVerification
        email={email}
        onVerified={() => {
          toast.success('تم تأكيد بريدك. سجّل الدخول الآن.')
          navigate('/login', { state: { email, verified: true }, replace: true })
        }}
      />

      <p className="mt-6 border-t border-border pt-4 text-center text-sm text-muted-foreground">
        <Link
          to="/login"
          className="font-medium text-foreground underline underline-offset-4 transition-colors hover:text-foreground/80"
        >
          العودة لتسجيل الدخول
        </Link>
      </p>
    </AuthLayout>
  )
}
