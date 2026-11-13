import { useState } from 'react'
import { Calendar, Code2, Globe, Link2, Settings, ZoomIn } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { ImagePreview } from '@/components/image-preview'
import { UserAvatar } from '@/components/user-avatar'
import { Button } from '@/components/ui/button'
import { formatCount, formatJoined, safeHostname } from '@/lib/format'
import type { Profile, ProfileStats } from '@/lib/types'

export function ProfileHeader({
  profile,
  stats,
  isOwn,
}: {
  profile: Profile
  stats: ProfileStats | undefined
  isOwn: boolean
}) {
  const [preview, setPreview] = useState<{ src: string; alt: string } | null>(null)

  async function copyProfileLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/u/${profile.username}`)
      toast.success('تم نسخ رابط الملف')
    } catch {
      toast.error('تعذّر نسخ الرابط.')
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {profile.cover_image_url ? (
        <button
          type="button"
          onClick={() =>
            setPreview({
              src: profile.cover_image_url,
              alt: `صورة غلاف ${profile.display_name}`,
            })
          }
          className="group relative block h-24 w-full cursor-zoom-in overflow-hidden sm:h-32"
          aria-label="تكبير صورة الغلاف"
        >
          <img
            src={profile.cover_image_url}
            alt={`صورة غلاف ${profile.display_name}`}
            className="size-full object-cover"
          />
          <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/20">
            <span className="rounded-full bg-black/50 p-2 text-white opacity-0 transition-opacity group-hover:opacity-100">
              <ZoomIn className="size-4" />
            </span>
          </span>
        </button>
      ) : null}

      <div className="px-4 pb-4 sm:px-5">
        <div
          className={
            profile.cover_image_url
              ? '-mt-12 flex flex-wrap items-end justify-between gap-3'
              : 'flex flex-wrap items-start justify-between gap-3 pt-4'
          }
        >
          {profile.avatar_url ? (
            <button
              type="button"
              onClick={() =>
                setPreview({
                  src: profile.avatar_url,
                  alt: `صورة ${profile.display_name}`,
                })
              }
              className="group relative cursor-zoom-in rounded-full"
              aria-label="تكبير الصورة الشخصية"
            >
              <UserAvatar
                profile={profile}
                className="size-20 border-4 border-card bg-secondary sm:size-24"
              />
              <span className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-full bg-black/0 text-white opacity-0 transition-opacity group-hover:bg-black/25 group-hover:opacity-100">
                <ZoomIn className="size-5" />
              </span>
            </button>
          ) : (
            <UserAvatar
              profile={profile}
              className="size-20 border-4 border-card bg-secondary sm:size-24"
            />
          )}

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void copyProfileLink()}
            >
              <Link2 />
              مشاركة
            </Button>
            {isOwn ? (
              <Button asChild size="sm">
                <Link to="/settings">
                  <Settings />
                  تعديل
                </Link>
              </Button>
            ) : null}
          </div>
        </div>

        <div className="mt-3">
          <h1 dir="auto" className="text-lg font-semibold tracking-tight">
            {profile.display_name}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            <span dir="ltr">@{profile.username}</span>
          </p>

          {profile.bio ? (
            <p
              dir="auto"
              className="mt-3 max-w-prose whitespace-pre-wrap break-words text-sm leading-7 text-foreground/85"
            >
              {profile.bio}
            </p>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="size-3.5" />
              انضم في {formatJoined(profile.created_at)}
            </span>
            {profile.website ? (
              <a
                href={profile.website}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
              >
                <Globe className="size-3.5" />
                {safeHostname(profile.website)}
              </a>
            ) : null}
            {profile.github ? (
              <a
                href={profile.github}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
              >
                <Code2 className="size-3.5" />
                {safeHostname(profile.github)}
              </a>
            ) : null}
          </div>

          <dl className="mt-4 flex gap-6 border-t border-border pt-3">
            <div>
              <dt className="text-xs text-muted-foreground">المنشورات</dt>
              <dd className="mt-0.5 text-sm font-semibold tabular-nums">
                {stats ? formatCount(stats.posts) : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">الإعجابات</dt>
              <dd className="mt-0.5 text-sm font-semibold tabular-nums">
                {stats ? formatCount(stats.likes) : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">التعليقات</dt>
              <dd className="mt-0.5 text-sm font-semibold tabular-nums">
                {stats ? formatCount(stats.comments) : '—'}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {preview ? (
        <ImagePreview
          open
          onOpenChange={(open) => {
            if (!open) setPreview(null)
          }}
          src={preview.src}
          alt={preview.alt}
        />
      ) : null}
    </div>
  )
}
