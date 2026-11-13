import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowRight, Image, Loader2, LogOut, Trash } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ImagePreview } from '@/components/image-preview'
import { ThemeOptions } from '@/components/theme-options'
import { UserAvatar } from '@/components/user-avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/hooks/use-auth'
import {
  useRemoveCover,
  useUpdateAvatar,
  useUpdateCover,
  useUpdateProfile,
} from '@/hooks/use-mutations'
import { supabase } from '@/lib/supabase'
import {
  isHttpsUrl,
  normalizeUrl,
  normalizeUsername,
  USERNAME_REGEX,
} from '@/lib/validation'

interface FormState {
  displayName: string
  username: string
  bio: string
  website: string
  github: string
}

export function SettingsPage() {
  const { user, profile, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const updateProfile = useUpdateProfile()
  const updateAvatar = useUpdateAvatar()
  const updateCover = useUpdateCover()
  const removeCover = useRemoveCover()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)
  const initializedFor = useRef<string | null>(null)

  const [form, setForm] = useState<FormState>({
    displayName: '',
    username: '',
    bio: '',
    website: '',
    github: '',
  })
  const [error, setError] = useState('')
  const [coverPreviewOpen, setCoverPreviewOpen] = useState(false)
  const [avatarPreviewOpen, setAvatarPreviewOpen] = useState(false)

  useEffect(() => {
    if (profile && initializedFor.current !== profile.id) {
      initializedFor.current = profile.id
      setForm({
        displayName: profile.display_name,
        username: profile.username,
        bio: profile.bio,
        website: profile.website,
        github: profile.github,
      })
    }
  }, [profile])

  if (!profile) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-40 rounded-xl" />
        </div>
        <Skeleton className="h-72 w-full rounded-2xl" />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void refreshProfile()}
        >
          إعادة تحميل الملف
        </Button>
      </div>
    )
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    const displayName = form.displayName.trim()
    const username = normalizeUsername(form.username)
    const bio = form.bio.trim()
    const website = normalizeUrl(form.website)
    const github = normalizeUrl(form.github)

    if (displayName.length < 1 || displayName.length > 48) {
      setError('الاسم الظاهر لازم يكون من 1 إلى 48 حرفًا.')
      return
    }
    if (!USERNAME_REGEX.test(username)) {
      setError('اسم المستخدم من 3 إلى 24 حرفًا: حروف إنجليزية صغيرة وأرقام وشرطة سفلية.')
      return
    }
    if (bio.length > 240) {
      setError('النبذة لازم تكون 240 حرفًا أو أقل.')
      return
    }
    if (!isHttpsUrl(website)) {
      setError('الموقع لازم يكون رابط https:// صحيح.')
      return
    }
    if (!isHttpsUrl(github)) {
      setError('GitHub لازم يكون رابط https:// صحيح.')
      return
    }

    updateProfile.mutate(
      {
        display_name: displayName,
        username,
        bio,
        website,
        github,
      },
      {
        onSuccess: (updated) => {
          setForm({
            displayName: updated.display_name,
            username: updated.username,
            bio: updated.bio,
            website: updated.website,
            github: updated.github,
          })
          toast.success('تم تحديث الملف')
        },
        onError: (mutationError) => {
          const message = mutationError.message.includes('duplicate key')
            ? 'اسم المستخدم محجوز.'
            : mutationError.message
          setError(message)
          toast.error(message)
        },
      },
    )
  }

  function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    updateAvatar.mutate(file, {
      onSuccess: () => toast.success('تم تحديث الصورة'),
      onError: (mutationError) => toast.error(mutationError.message),
    })
  }

  function handleCoverChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    updateCover.mutate(file, {
      onSuccess: () => toast.success('تم تحديث صورة الغلاف'),
      onError: (mutationError) => toast.error(mutationError.message),
    })
  }

  function handleRemoveCover() {
    removeCover.mutate(undefined, {
      onSuccess: () => toast.success('تم حذف صورة الغلاف'),
      onError: (mutationError) => toast.error(mutationError.message),
    })
  }

  async function handleSignOut() {
    const { error: signOutError } = await supabase.auth.signOut()
    if (signOutError) {
      toast.error(signOutError.message)
      return
    }
    queryClient.clear()
    toast.success('تم تسجيل الخروج')
    navigate('/')
  }

  return (
    <div className="space-y-4">
      <header>
        <Link
          to={`/u/${profile.username}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowRight className="size-4" />
          العودة للملف
        </Link>
        <h1 className="mt-3 font-heading text-xl font-semibold tracking-tight">الإعدادات</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          تحكم في طريقة ظهورك في بوتد.
        </p>
      </header>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <section className="p-4 sm:p-5">
          <h2 className="text-sm font-semibold">الملف العام</h2>

          <form onSubmit={handleSubmit}>
            <div className="mt-4 space-y-5">
            <div className="space-y-2.5">
              <div className="overflow-hidden rounded-xl border border-border bg-secondary">
                {profile.cover_image_url ? (
                  <button
                    type="button"
                    onClick={() => setCoverPreviewOpen(true)}
                    className="block w-full cursor-zoom-in"
                    aria-label="تكبير صورة الغلاف"
                  >
                    <img
                      src={profile.cover_image_url}
                      alt="صورة الغلاف"
                      className="h-32 w-full object-cover sm:h-40"
                    />
                  </button>
                ) : (
                  <div className="flex h-32 items-center justify-center text-sm text-muted-foreground sm:h-40">
                    ما فيه صورة غلاف
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => coverInputRef.current?.click()}
                  disabled={updateCover.isPending}
                >
                  {updateCover.isPending ? <Loader2 className="animate-spin" /> : <Image />}
                  {profile.cover_image_url ? 'تغيير الغلاف' : 'إضافة غلاف'}
                </Button>
                {profile.cover_image_url ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveCover}
                    disabled={removeCover.isPending}
                  >
                    {removeCover.isPending ? <Loader2 className="animate-spin" /> : <Trash />}
                    إزالة الغلاف
                  </Button>
                ) : null}
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleCoverChange}
                  className="hidden"
                />
              </div>

              <p className="text-xs text-muted-foreground">
                صورة الغلاف: PNG أو JPG أو WebP · حتى 5 ميجابايت
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <div className="relative">
                {profile.avatar_url ? (
                  <button
                    type="button"
                    onClick={() => setAvatarPreviewOpen(true)}
                    className="block cursor-zoom-in rounded-full"
                    aria-label="تكبير الصورة الشخصية"
                  >
                    <UserAvatar profile={profile} className="size-16" />
                  </button>
                ) : (
                  <UserAvatar profile={profile} className="size-16" />
                )}
                {updateAvatar.isPending ? (
                  <span className="absolute inset-0 flex items-center justify-center rounded-full bg-background/70">
                    <Loader2 className="size-4 animate-spin" />
                  </span>
                ) : null}
              </div>
              <div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={updateAvatar.isPending}
                >
                  تغيير الصورة
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
                <p className="mt-1.5 text-xs text-muted-foreground">
                  PNG أو JPG أو WebP · حتى 2 ميجابايت
                </p>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="display-name">الاسم الظاهر</Label>
              <Input
                id="display-name"
                value={form.displayName}
                onChange={(event) =>
                  setForm((current) => ({ ...current, displayName: event.target.value }))
                }
                maxLength={48}
                dir="auto"
                autoComplete="name"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="username">اسم المستخدم</Label>
              <div className="flex items-center rounded-xl border border-input bg-transparent transition-colors focus-within:border-ring">
                <span className="ps-3 text-sm text-muted-foreground">@</span>
                <Input
                  id="username"
                  value={form.username}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      username: event.target.value.toLowerCase(),
                    }))
                  }
                  maxLength={24}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  className="border-0 bg-transparent shadow-none focus-visible:ring-0"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                3–24 حرفًا · a–z و0–9 والشرطة السفلية
              </p>
            </div>

            <div className="grid gap-2">
              <div className="flex items-baseline justify-between">
                <Label htmlFor="bio">النبذة</Label>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {form.bio.length}/240
                </span>
              </div>
              <Textarea
                id="bio"
                value={form.bio}
                onChange={(event) =>
                  setForm((current) => ({ ...current, bio: event.target.value }))
                }
                rows={3}
                maxLength={240}
                dir="auto"
                placeholder="ايش تبني أو تبحث أو تفكّك؟"
                className="min-h-20 resize-none"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="website">الموقع</Label>
                <Input
                  id="website"
                  value={form.website}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, website: event.target.value }))
                  }
                  placeholder="https://example.com"
                  inputMode="url"
                  dir="ltr"
                  className="text-start"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="github">GitHub</Label>
                <Input
                  id="github"
                  value={form.github}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, github: event.target.value }))
                  }
                  placeholder="https://github.com/you"
                  inputMode="url"
                  dir="ltr"
                  className="text-start"
                />
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

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
              <Button asChild variant="ghost" size="sm">
                <Link to={`/u/${profile.username}`}>عرض الملف</Link>
              </Button>
              <Button type="submit" size="sm" disabled={updateProfile.isPending}>
                {updateProfile.isPending ? <Loader2 className="animate-spin" /> : null}
                حفظ التغييرات
              </Button>
            </div>
          </div>
          </form>
        </section>

        <section className="border-t border-border p-4 sm:p-5">
          <h2 className="text-sm font-semibold">المظهر</h2>
          <div className="mt-4 space-y-3">
            <ThemeOptions />
            <p className="text-xs leading-6 text-muted-foreground">
              اختيار «حسب النظام» يتبع إعداد الجهاز تلقائيًا.
            </p>
          </div>
        </section>

        <section className="border-t border-border p-4 sm:p-5">
          <h2 className="text-sm font-semibold">الحساب</h2>
          <div className="mt-4 space-y-4">
            <div>
              <p className="text-sm font-medium">البريد الإلكتروني</p>
              <p className="mt-1 text-sm text-muted-foreground">{user?.email}</p>
              <p className="mt-1 text-xs leading-6 text-muted-foreground">
                بريدك خاص وما يظهر في ملفك.
              </p>
            </div>
            <div className="border-t border-border pt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void handleSignOut()}
              >
                <LogOut />
                تسجيل الخروج
              </Button>
            </div>
          </div>
        </section>
      </div>

      {profile.cover_image_url ? (
        <ImagePreview
          open={coverPreviewOpen}
          onOpenChange={setCoverPreviewOpen}
          src={profile.cover_image_url}
          alt="صورة الغلاف"
        />
      ) : null}

      {profile.avatar_url ? (
        <ImagePreview
          open={avatarPreviewOpen}
          onOpenChange={setAvatarPreviewOpen}
          src={profile.avatar_url}
          alt="الصورة الشخصية"
        />
      ) : null}
    </div>
  )
}
