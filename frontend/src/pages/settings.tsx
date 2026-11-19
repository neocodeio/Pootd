import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  ArrowRight01Icon,
  Cancel01Icon,
  Delete02Icon,
  Image01Icon,
  Key01Icon,
  Loading03Icon,
  Logout01Icon,
  Mail01Icon,
  PlusSignIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { ImagePreview } from '@/components/image-preview'
import { MutedAccounts } from '@/components/profile/muted-accounts'
import { ThemeOptions } from '@/components/theme-options'
import { UserAvatar } from '@/components/user-avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/hooks/use-auth'
import {
  useDeleteAccount,
  useRemoveCover,
  useUpdateAvatar,
  useUpdateCover,
  useUpdateProfile,
} from '@/hooks/use-mutations'
import { supabase } from '@/lib/supabase'
import {
  MAX_SOCIAL_LINKS,
  parseSocialLinks,
  prepareSocialLinks,
  SOCIAL_PLATFORM_ORDER,
  SOCIAL_PLATFORMS,
} from '@/lib/social'
import {
  isEmail,
  isHttpsUrl,
  normalizeUrl,
  normalizeUsername,
  USERNAME_REGEX,
} from '@/lib/validation'
import type { SocialLink, SocialPlatform } from '@/lib/types'

interface FormState {
  displayName: string
  username: string
  bio: string
  website: string
  socialLinks: SocialLink[]
}

export function SettingsPage() {
  const { user, profile, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const updateProfile = useUpdateProfile()
  const updateAvatar = useUpdateAvatar()
  const updateCover = useUpdateCover()
  const removeCover = useRemoveCover()
  const deleteAccount = useDeleteAccount()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)
  const initializedFor = useRef<string | null>(null)

  const [form, setForm] = useState<FormState>({
    displayName: '',
    username: '',
    bio: '',
    website: '',
    socialLinks: [],
  })
  const [error, setError] = useState('')
  const [coverPreviewOpen, setCoverPreviewOpen] = useState(false)
  const [avatarPreviewOpen, setAvatarPreviewOpen] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [emailPending, setEmailPending] = useState(false)
  const [resetPending, setResetPending] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')

  useEffect(() => {
    if (profile && initializedFor.current !== profile.id) {
      initializedFor.current = profile.id
      setForm({
        displayName: profile.display_name,
        username: profile.username,
        bio: profile.bio,
        website: profile.website,
        socialLinks: parseSocialLinks(profile.social_links),
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
    const social = prepareSocialLinks(form.socialLinks)

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
    if (social.error) {
      setError(social.error)
      return
    }

    updateProfile.mutate(
      {
        display_name: displayName,
        username,
        bio,
        website,
        social_links: social.links,
      },
      {
        onSuccess: (updated) => {
          setForm({
            displayName: updated.display_name,
            username: updated.username,
            bio: updated.bio,
            website: updated.website,
            socialLinks: parseSocialLinks(updated.social_links),
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

  function addSocialLink() {
    setForm((current) => {
      if (current.socialLinks.length >= MAX_SOCIAL_LINKS) return current

      const used = new Set(current.socialLinks.map((link) => link.platform))
      const platform = SOCIAL_PLATFORM_ORDER.find((option) => !used.has(option))
      if (!platform) return current

      return {
        ...current,
        socialLinks: [...current.socialLinks, { platform, url: '' }],
      }
    })
  }

  function removeSocialLink(index: number) {
    setForm((current) => ({
      ...current,
      socialLinks: current.socialLinks.filter((_, position) => position !== index),
    }))
  }

  function changeSocialPlatform(index: number, platform: SocialPlatform) {
    setForm((current) => ({
      ...current,
      socialLinks: current.socialLinks.map((link, position) =>
        position === index ? { ...link, platform, url: '' } : link,
      ),
    }))
  }

  function changeSocialUrl(index: number, url: string) {
    setForm((current) => ({
      ...current,
      socialLinks: current.socialLinks.map((link, position) =>
        position === index ? { ...link, url } : link,
      ),
    }))
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

  async function handleEmailChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const email = newEmail.trim().toLowerCase()

    if (!isEmail(email)) {
      toast.error('أدخل بريدًا إلكترونيًا صحيحًا.')
      return
    }
    if (email === user?.email?.toLowerCase()) {
      toast.error('هذا بريدك الحالي.')
      return
    }

    setEmailPending(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ email })
      if (updateError) {
        toast.error(updateError.message)
        return
      }
      setNewEmail('')
      toast.success('أرسلنا رابط تأكيد للبريد الجديد. افتحه لإكمال التغيير.')
    } catch (unknownError) {
      toast.error(
        unknownError instanceof Error ? unknownError.message : 'حدث خطأ غير متوقع.',
      )
    } finally {
      setEmailPending(false)
    }
  }

  async function handleResetPassword() {
    if (!user?.email) return

    setResetPending(true)
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        user.email,
        { redirectTo: `${window.location.origin}/reset/password` },
      )
      if (resetError) {
        toast.error(resetError.message)
        return
      }
      toast.success('أرسلنا رابط إعادة تعيين كلمة المرور إلى بريدك.')
    } catch (unknownError) {
      toast.error(
        unknownError instanceof Error ? unknownError.message : 'حدث خطأ غير متوقع.',
      )
    } finally {
      setResetPending(false)
    }
  }

  function handleDeleteAccount() {
    if (deleteConfirm.trim() !== 'حذف') {
      toast.error('اكتب «حذف» للتأكيد.')
      return
    }

    deleteAccount.mutate(undefined, {
      onSuccess: () => {
        setDeleteOpen(false)
        toast.success('تم حذف حسابك.')
        navigate('/', { replace: true })
      },
      onError: (deleteError) => toast.error(deleteError.message),
    })
  }

  return (
    <div className="space-y-4">
      <header>
        <Link
          to={`/u/${profile.username}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <HugeiconsIcon icon={ArrowRight01Icon} className="size-4" />
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
                  {updateCover.isPending ? (
                    <HugeiconsIcon icon={Loading03Icon} className="animate-spin" />
                  ) : (
                    <HugeiconsIcon icon={Image01Icon} />
                  )}
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
                    {removeCover.isPending ? (
                      <HugeiconsIcon icon={Loading03Icon} className="animate-spin" />
                    ) : (
                      <HugeiconsIcon icon={Delete02Icon} />
                    )}
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
                    <HugeiconsIcon
                      icon={Loading03Icon}
                      className="size-4 animate-spin"
                    />
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

            <div className="grid gap-3">
              <div className="flex items-baseline justify-between gap-3">
                <Label>حسابات التواصل</Label>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {form.socialLinks.length}/{MAX_SOCIAL_LINKS}
                </span>
              </div>

              {form.socialLinks.length > 0 ? (
                <div className="grid gap-2">
                  {form.socialLinks.map((link, index) => {
                    const config = SOCIAL_PLATFORMS[link.platform]
                    const used = new Set(form.socialLinks.map((row) => row.platform))

                    return (
                      <div
                        key={index}
                        className="rounded-xl border border-border bg-secondary/20 p-2.5"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-foreground"
                            aria-hidden="true"
                          >
                            <HugeiconsIcon icon={config.icon} className="size-4" />
                          </span>
                          <select
                            value={link.platform}
                            onChange={(event) =>
                              changeSocialPlatform(
                                index,
                                event.target.value as SocialPlatform,
                              )
                            }
                            aria-label={`المنصة للحساب ${index + 1}`}
                            className="h-8 max-w-[12rem] min-w-0 cursor-pointer truncate rounded-lg bg-transparent px-1 text-sm font-medium text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
                          >
                            {SOCIAL_PLATFORM_ORDER.map((platform) => (
                              <option
                                key={platform}
                                value={platform}
                                disabled={
                                  platform !== link.platform && used.has(platform)
                                }
                              >
                                {SOCIAL_PLATFORMS[platform].label}
                              </option>
                            ))}
                          </select>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => removeSocialLink(index)}
                            aria-label={`حذف حساب ${config.label}`}
                            className="ms-auto rounded-full text-muted-foreground hover:text-foreground"
                          >
                            <HugeiconsIcon icon={Cancel01Icon} className="size-4" />
                          </Button>
                        </div>
                        <Input
                          value={link.url}
                          onChange={(event) => changeSocialUrl(index, event.target.value)}
                          placeholder={config.placeholder}
                          inputMode="url"
                          dir="ltr"
                          aria-label={`رابط ${config.label}`}
                          className="mt-2 h-9 text-start"
                        />
                      </div>
                    )
                  })}
                </div>
              ) : null}

              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addSocialLink}
                  disabled={form.socialLinks.length >= MAX_SOCIAL_LINKS}
                >
                  <HugeiconsIcon icon={PlusSignIcon} />
                  إضافة حساب
                </Button>
                <span className="text-xs text-muted-foreground">
                  حتى {MAX_SOCIAL_LINKS} حسابات فقط، وتظهر كأيقونات في ملفك.
                </span>
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
                {updateProfile.isPending ? (
                  <HugeiconsIcon icon={Loading03Icon} className="animate-spin" />
                ) : null}
                حفظ التغييرات
              </Button>
            </div>
          </div>
          </form>
        </section>

        <MutedAccounts />

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
                <HugeiconsIcon icon={Logout01Icon} />
                تسجيل الخروج
              </Button>
            </div>
          </div>
        </section>

        <section className="border-t border-border p-4 sm:p-5">
          <h2 className="text-sm font-semibold">الأمان</h2>
          <div className="mt-4 space-y-5">
            <form onSubmit={handleEmailChange} className="space-y-2">
              <Label htmlFor="new-email">تغيير البريد الإلكتروني</Label>
              <p className="text-xs text-muted-foreground">
                الحالي: <span dir="ltr">{user?.email}</span>
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  id="new-email"
                  type="email"
                  value={newEmail}
                  onChange={(event) => setNewEmail(event.target.value)}
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder="new@example.com"
                  dir="ltr"
                  className="text-start"
                />
                <Button
                  type="submit"
                  variant="outline"
                  size="sm"
                  disabled={emailPending || !newEmail.trim()}
                >
                  {emailPending ? (
                    <HugeiconsIcon icon={Loading03Icon} className="animate-spin" />
                  ) : (
                    <HugeiconsIcon icon={Mail01Icon} />
                  )}
                  إرسال رابط التأكيد
                </Button>
              </div>
              <p className="text-xs leading-6 text-muted-foreground">
                نرسل رابطًا للبريد الجديد لتأكيده قبل أن يتغيّر.
              </p>
            </form>

            <div className="border-t border-border pt-4">
              <p className="text-sm font-medium">كلمة المرور</p>
              <p className="mt-1 text-xs leading-6 text-muted-foreground">
                نرسل رابطًا آمنًا لبريدك لتعيين كلمة مرور جديدة.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void handleResetPassword()}
                disabled={resetPending || !user?.email}
                className="mt-3"
              >
                {resetPending ? (
                  <HugeiconsIcon icon={Loading03Icon} className="animate-spin" />
                ) : (
                  <HugeiconsIcon icon={Key01Icon} />
                )}
                إرسال رابط إعادة التعيين
              </Button>
            </div>

            <div className="border-t border-border pt-4">
              <p className="text-sm font-medium">حذف الحساب</p>
              <p className="mt-1 text-xs leading-6 text-muted-foreground">
                حذف الحساب يمسح ملفك ومنشوراتك وتعليقاتك وإعجاباتك نهائيًا. ما
                تقدر تتراجع عن هذا الإجراء.
              </p>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => {
                  setDeleteConfirm('')
                  setDeleteOpen(true)
                }}
                className="mt-3"
              >
                <HugeiconsIcon icon={Delete02Icon} />
                حذف الحساب
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

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open)
          if (!open) setDeleteConfirm('')
        }}
        title="حذف الحساب"
        description="سيتم حذف حسابك وملفك ومنشوراتك وتعليقاتك نهائيًا. ما تقدر تتراجع عن هذا الإجراء."
        confirmLabel="حذف الحساب نهائيًا"
        pending={deleteAccount.isPending}
        onConfirm={handleDeleteAccount}
      >
        <div className="grid gap-2">
          <Label htmlFor="delete-confirm">اكتب «حذف» للتأكيد</Label>
          <Input
            id="delete-confirm"
            value={deleteConfirm}
            onChange={(event) => setDeleteConfirm(event.target.value)}
            autoComplete="off"
            dir="auto"
          />
        </div>
      </ConfirmDialog>
    </div>
  )
}
