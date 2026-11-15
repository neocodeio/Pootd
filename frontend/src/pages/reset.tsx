import { useState } from 'react'
import type { FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import { Link, Navigate } from 'react-router-dom'
import { AuthLayout } from '@/components/auth/auth-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks/use-auth'
import { authErrorMessage } from '@/lib/auth-errors'
import { supabase } from '@/lib/supabase'
import { isEmail } from '@/lib/validation'

export function ResetPage() {
  const { user, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const [sent, setSent] = useState(false)

  if (!loading && user) {
    return <Navigate to="/settings" replace />
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    if (!isEmail(email)) {
      setError('أدخل بريدًا إلكترونيًا صحيحًا.')
      return
    }

    setPending(true)
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        { redirectTo: `${window.location.origin}/reset/password` },
      )

      if (resetError) {
        setError(authErrorMessage(resetError.message))
        return
      }

      setSent(true)
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
        <h1 className="font-heading text-xl font-semibold tracking-tight">
          نسيت كلمة المرور؟
        </h1>
        <p className="mt-2 text-sm leading-7 text-muted-foreground">
          أدخل بريدك ونرسل لك رابطًا لتعيين كلمة مرور جديدة.
        </p>
      </div>

      {sent ? (
        <div className="space-y-4">
          <p
            role="status"
            className="rounded-xl border border-border bg-secondary px-3 py-3 text-sm leading-7 text-foreground"
          >
            إذا كان البريد مسجلًا عندنا، وصلك رابط إعادة التعيين. افتح الرابط من
            نفس الجهاز وأكمل الخطوات.
          </p>
          <Button asChild variant="outline" className="w-full">
            <Link to="/login">العودة لتسجيل الدخول</Link>
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="reset-email">البريد الإلكتروني</Label>
            <Input
              id="reset-email"
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

          {error ? (
            <p
              role="alert"
              className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {error}
            </p>
          ) : null}

          <Button type="submit" disabled={pending} className="w-full">
            {pending ? <Loader2 className="animate-spin" /> : null}
            إرسال رابط الإعادة
          </Button>
        </form>
      )}

      <p className="mt-6 border-t border-border pt-4 text-center text-sm text-muted-foreground">
        تذكرت كلمة المرور؟{' '}
        <Link
          to="/login"
          className="font-medium text-foreground underline underline-offset-4 transition-colors hover:text-foreground/80"
        >
          سجّل الدخول
        </Link>
      </p>
    </AuthLayout>
  )
}
