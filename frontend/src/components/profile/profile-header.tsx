import { useState } from 'react'
import {
  Calendar01Icon,
  BriefcaseBusinessIcon,
  Link04Icon,
  Settings01Icon,
  ZoomInIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { ImagePreview } from '@/components/image-preview'
import { FollowButton } from '@/components/profile/follow-button'
import { FollowList } from '@/components/profile/follow-list'
import { UserAvatar } from '@/components/user-avatar'
import { VerifiedBadge } from '@/components/verified-badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useAuth } from '@/hooks/use-auth'
import { formatCount, formatJoined, safeHostname } from '@/lib/format'
import { parseSocialLinks, SOCIAL_PLATFORMS } from '@/lib/social'
import { isVerified } from '@/lib/verified'
import type { Profile, ProfileStats } from '@/lib/types'

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="block text-xs text-muted-foreground">{label}</span>
      <span className="mt-0.5 block text-sm font-semibold tabular-nums">
        {value}
      </span>
    </div>
  )
}

function StatButton({
  label,
  value,
  onClick,
}: {
  label: string
  value: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-haspopup="dialog"
      aria-label={`عرض ${label}`}
      className="group -mx-2 -my-1.5 rounded-lg px-2 py-1.5 text-start outline-none transition-colors hover:bg-secondary/60 focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <span className="block text-xs text-muted-foreground transition-colors group-hover:text-foreground">
        {label}
      </span>
      <span className="mt-0.5 block text-sm font-semibold tabular-nums">
        {value}
      </span>
    </button>
  )
}

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
  const { user } = useAuth()
  const [list, setList] = useState<{ kind: 'followers' | 'following'; open: boolean } | null>(null)
  // Counters come from the profile row (maintained by database triggers), so
  // they are correct for signed-out visitors and never require loading the
  // whole graph.
  const followersCount = profile.followers_count ?? 0
  const followingCount = profile.following_count ?? 0
  const socialLinks = parseSocialLinks(profile.social_links)

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
              <HugeiconsIcon icon={ZoomInIcon} className="size-4" />
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
                <HugeiconsIcon icon={ZoomInIcon} className="size-5" />
              </span>
            </button>
          ) : (
            <UserAvatar
              profile={profile}
              className="size-20 border-4 border-card bg-secondary sm:size-24"
            />
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void copyProfileLink()}
            >
              <HugeiconsIcon icon={Link04Icon} />
              مشاركة
            </Button>
            {isOwn ? (
              <Button asChild size="sm">
                <Link to="/settings">
                  <HugeiconsIcon icon={Settings01Icon} />
                  تعديل
                </Link>
              </Button>
            ) : user ? (
              <FollowButton targetUserId={profile.id} />
            ) : null}
          </div>
        </div>

        <div className="mt-3">
          <h1 dir="auto" className="flex flex-wrap items-center gap-1.5 text-lg font-semibold tracking-tight">
            {profile.display_name}
            {isVerified(profile.username) ? <VerifiedBadge /> : null}
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

          {socialLinks.length > 0 ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {socialLinks.map((link) => {
                const config = SOCIAL_PLATFORMS[link.platform]

                return (
                  <Tooltip key={link.platform}>
                    <TooltipTrigger asChild>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        aria-label={config.label}
                        className="inline-flex size-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                      >
                        <HugeiconsIcon icon={config.icon} className="size-4" aria-hidden="true" />
                      </a>
                    </TooltipTrigger>
                    <TooltipContent side="top" sideOffset={4}>
                      {config.label}
                    </TooltipContent>
                  </Tooltip>
                )
              })}
            </div>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <HugeiconsIcon icon={Calendar01Icon} className="size-3.5" />
              انضم في {formatJoined(profile.created_at)}
            </span>
            {profile.website ? (
              <a
                href={profile.website}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
              >
                <HugeiconsIcon icon={BriefcaseBusinessIcon} className="size-3.5" />
                {safeHostname(profile.website)}
              </a>
            ) : null}
          </div>

          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 border-t border-border pt-3">
            {user ? (
              <>
                <StatButton
                  label="المتابعون"
                  value={formatCount(followersCount)}
                  onClick={() => setList({ kind: 'followers', open: true })}
                />
                <StatButton
                  label="يتابع"
                  value={formatCount(followingCount)}
                  onClick={() => setList({ kind: 'following', open: true })}
                />
              </>
            ) : (
              <>
                <Stat label="المتابعون" value={formatCount(followersCount)} />
                <Stat label="يتابع" value={formatCount(followingCount)} />
              </>
            )}
            <Stat
              label="المنشورات"
              value={stats ? formatCount(stats.posts) : '—'}
            />
            <Stat
              label="الإعجابات"
              value={stats ? formatCount(stats.likes) : '—'}
            />
            <Stat
              label="التعليقات"
              value={stats ? formatCount(stats.comments) : '—'}
            />
          </div>
        </div>
      </div>

      <FollowList
        open={list?.open ?? false}
        onOpenChange={(open) => {
          if (!open) setList(null)
        }}
        userId={user ? profile.id : undefined}
        kind={list?.kind ?? 'followers'}
      />
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
