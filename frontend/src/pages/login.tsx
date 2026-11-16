import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Loading03Icon, ViewIcon, ViewOffIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { AuthLayout } from '@/components/auth/auth-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks/use-auth'
import { authErrorMessage } from '@/lib/auth-errors'
import { supabase } from '@/lib/supabase'
import { isEmail } from '@/lib/validation'

export function LoginPage() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const locationState = location.state as
    | { from?: string; email?: string; verified?: boolean }
    | null
  const from =
    locationState?.from &&
    locationState.from.startsWith('/') &&
    !locationState.from.startsWith('//')
      ? locationState.from
      : '/'

  const [email, setEmail] = useState(locationState?.email ?? '')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const [needsVerification, setNeedsVerification] = useState(false)
  const verified = Boolean(locationState?.verified)

  useEffect(() => {
    if (verified) toast.success('تم تأكيد بريدك. سجّل الدخول.')
  }, [verified])

  if (!loading && user) {
    return <Navigate to={from} replace />
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setNeedsVerification(false)

    if (!isEmail(email)) {
      setError('أدخل بريدًا إلكترونيًا صحيحًا.')
      return
    }
    if (!password) {
      setError('أدخل كلمة المرور.')
      return
    }

    setPending(true)
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (signInError) {
        if (signInError.message.toLowerCase().includes('email not confirmed')) {
          setNeedsVerification(true)
        }
        setError(authErrorMessage(signInError.message))
        return
      }

      toast.success('أهلًا بعودتك')
      navigate(from, { replace: true })
    } catch (unknownError) {
      setError(
        unknownError instanceof Error ? unknownError.message : 'حدث خطأ غير متوقع.',
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <AuthLayout>
      <div className="mb-6">
        <h1 className="font-heading text-xl font-semibold tracking-tight">أهلًا بعودتك.</h1>
        <p className="mt-2 text-sm leading-7 text-muted-foreground">
          سجّل دخولك عشان تنشر وتعلّق وتتفاعل.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="email">البريد الإلكتروني</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="you@example.com"
            dir="ltr"
            className="text-start"
          />
        </div>

        <div className="grid gap-2">
          <div className="flex items-baseline justify-between gap-2">
            <Label htmlFor="password">كلمة المرور</Label>
            <Link
              to="/reset"
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              نسيت كلمة المرور؟
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              className="pe-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              className="absolute end-2 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
              aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
            >
              {showPassword ? (
                <HugeiconsIcon icon={ViewOffIcon} className="size-4" />
              ) : (
                <HugeiconsIcon icon={ViewIcon} className="size-4" />
              )}
            </button>
          </div>
        </div>

        {error ? (
          <p
            role="alert"
            className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </p>
        ) : null}

        {needsVerification ? (
          <p className="text-center text-sm">
            <Link
              to={`/verify?email=${encodeURIComponent(email.trim())}`}
              className="font-medium text-foreground underline underline-offset-4 transition-colors hover:text-foreground/80"
            >
              أدخل رمز التحقق
            </Link>
          </p>
        ) : null}

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? (
            <HugeiconsIcon icon={Loading03Icon} className="animate-spin" />
          ) : null}
          تسجيل الدخول
        </Button>
      </form>

      <p className="mt-6 border-t border-border pt-4 text-center text-sm text-muted-foreground">
        ما عندك حساب؟{' '}
        <Link
          to="/signup"
          className="font-medium text-foreground underline underline-offset-4 transition-colors hover:text-foreground/80"
        >
          أنشئ حسابًا
        </Link>
      </p>
    </AuthLayout>
  )
}
