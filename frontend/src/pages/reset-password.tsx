import { useState } from 'react'
import type { FormEvent } from 'react'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { AuthLayout } from '@/components/auth/auth-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/hooks/use-auth'
import { authErrorMessage } from '@/lib/auth-errors'
import { supabase } from '@/lib/supabase'

const MIN_PASSWORD_LENGTH = 8

export function ResetPasswordPage() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`كلمة المرور لازم تكون ${MIN_PASSWORD_LENGTH} أحرف على الأقل.`)
      return
    }
    if (password !== confirm) {
      setError('كلمتا المرور غير متطابقتين.')
      return
    }

    setPending(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })

      if (updateError) {
        setError(authErrorMessage(updateError.message))
        return
      }

      toast.success('تم تعيين كلمة المرور. سجّل الدخول بها من الآن.')
      navigate('/', { replace: true })
    } catch (unknownError) {
      setError(
        unknownError instanceof Error ? unknownError.message : 'حدث خطأ غير متوقع.',
      )
    } finally {
      setPending(false)
    }
  }

  if (loading) {
    return (
      <AuthLayout>
        <div className="space-y-4">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </AuthLayout>
    )
  }

  if (!user) {
    return (
      <AuthLayout>
        <div className="mb-6">
          <h1 className="font-heading text-xl font-semibold tracking-tight">
            الرابط غير صالح
          </h1>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            رابط إعادة التعيين منتهي أو استُخدم من قبل. اطلب رابطًا جديدًا.
          </p>
        </div>
        <Button asChild className="w-full">
          <Link to="/reset">طلب رابط جديد</Link>
        </Button>
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
        <h1 className="font-heading text-xl font-semibold tracking-tight">
          كلمة مرور جديدة
        </h1>
        <p className="mt-2 text-sm leading-7 text-muted-foreground">
          اختر كلمة مرور قوية لحسابك.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="new-password">كلمة المرور الجديدة</Label>
          <div className="relative">
            <Input
              id="new-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              className="pe-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              className="absolute end-2 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
              aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="confirm-password">تأكيد كلمة المرور</Label>
          <Input
            id="confirm-password"
            type={showPassword ? 'text' : 'password'}
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            autoComplete="new-password"
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
          حفظ كلمة المرور
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
