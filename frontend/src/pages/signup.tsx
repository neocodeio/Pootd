import { useState } from 'react'
import type { FormEvent } from 'react'
import { Loading03Icon, ViewIcon, ViewOffIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { AuthLayout } from '@/components/auth/auth-layout'
import { OtpVerification } from '@/components/auth/otp-verification'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks/use-auth'
import { isUsernameAvailable } from '@/lib/api'
import { startSignup } from '@/lib/otp-api'
import { supabase } from '@/lib/supabase'
import { isEmail, normalizeUsername, USERNAME_REGEX } from '@/lib/validation'

export function SignupPage() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [userId, setUserId] = useState('')
  const [resendAfterSeconds, setResendAfterSeconds] = useState(60)

  if (!loading && user) {
    return <Navigate to="/" replace />
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    const cleanDisplayName = displayName.trim()
    const cleanUsername = normalizeUsername(username)
    const cleanEmail = email.trim()

    if (cleanDisplayName.length < 1 || cleanDisplayName.length > 48) {
      setError('الاسم الظاهر لازم يكون من 1 إلى 48 حرفًا.')
      return
    }
    if (!USERNAME_REGEX.test(cleanUsername)) {
      setError('اسم المستخدم من 3 إلى 24 حرفًا: حروف إنجليزية صغيرة وأرقام وشرطة سفلية.')
      return
    }
    if (!isEmail(cleanEmail)) {
      setError('أدخل بريدًا إلكترونيًا صحيحًا.')
      return
    }
    if (password.length < 8) {
      setError('كلمة المرور لازم تكون 8 أحرف على الأقل.')
      return
    }

    setPending(true)
    try {
      const available = await isUsernameAvailable(cleanUsername)
      if (!available) {
        setError('اسم المستخدم محجوز.')
        return
      }

      const result = await startSignup({
        displayName: cleanDisplayName,
        username: cleanUsername,
        email: cleanEmail,
        password,
      })

      setUserId(result.userId)
      setResendAfterSeconds(result.resendAfterSeconds)
      setSubmitted(true)
      toast.success('أرسلنا رمز التحقق إلى بريدك.')
    } catch (unknownError) {
      setError(
        unknownError instanceof Error ? unknownError.message : 'حدث خطأ غير متوقع.',
      )
    } finally {
      setPending(false)
    }
  }

  async function handleVerified() {
    const cleanEmail = email.trim()
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    })

    if (signInError) {
      toast.success('تم تأكيد بريدك. سجّل الدخول الآن.')
      navigate('/login', { state: { email: cleanEmail, verified: true }, replace: true })
      return
    }

    toast.success('أهلًا بك في بوتد')
    navigate('/', { replace: true })
  }

  if (submitted) {
    return (
      <AuthLayout>
        <OtpVerification
          email={email.trim()}
          userId={userId}
          initialResendAfterSeconds={resendAfterSeconds}
          onVerified={handleVerified}
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

  return (
    <AuthLayout>
      <div className="mb-6">
        <h1 className="font-heading text-xl font-semibold tracking-tight">أنشئ حسابك.</h1>
        <p className="mt-2 text-sm leading-7 text-muted-foreground">
          اسم مستخدم، بريد إلكتروني، وتبدأ.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="display-name">الاسم الظاهر</Label>
          <Input
            id="display-name"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            autoComplete="name"
            maxLength={48}
            dir="auto"
            placeholder="اسمك"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="username">اسم المستخدم</Label>
          <div className="flex items-center rounded-xl border border-input bg-transparent transition-colors focus-within:border-ring">
            <span className="ps-3 text-sm text-muted-foreground">@</span>
            <Input
              id="username"
              value={username}
              onChange={(event) => setUsername(event.target.value.toLowerCase())}
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              maxLength={24}
              className="border-0 bg-transparent shadow-none focus-visible:ring-0"
              placeholder="username"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            3–24 حرفًا · a–z و0–9 والشرطة السفلية
          </p>
        </div>

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
          <Label htmlFor="password">كلمة المرور</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              className="pe-10"
              placeholder="8 أحرف على الأقل"
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

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? (
            <HugeiconsIcon icon={Loading03Icon} className="animate-spin" />
          ) : null}
          إنشاء حساب
        </Button>

        <p className="text-center text-xs leading-6 text-muted-foreground">
          خلّ النقاش محترمًا وفي الموضوع. لا سبام، ولا نشر معلومات خاصة، ولا نشاط غير
          قانوني.
        </p>
      </form>

      <p className="mt-6 border-t border-border pt-4 text-center text-sm text-muted-foreground">
        عندك حساب؟{' '}
        <Link
          to="/login"
          className="font-medium text-foreground underline underline-offset-4 transition-colors hover:text-foreground/80"
        >
          تسجيل الدخول
        </Link>
      </p>

      <p className="mt-2 text-center text-xs text-muted-foreground">
        وصلك رمز تحقق؟{' '}
        <Link
          to="/verify"
          className="font-medium text-foreground underline underline-offset-4 transition-colors hover:text-foreground/80"
        >
          أكّد بريدك
        </Link>
      </p>
    </AuthLayout>
  )
}
