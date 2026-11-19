import { useEffect, useMemo, useState } from 'react'
import { CheckmarkCircle02Icon, UserAdd01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Link } from 'react-router-dom'
import { FollowButton } from '@/components/profile/follow-button'
import { UserAvatar } from '@/components/user-avatar'
import { VerifiedBadge } from '@/components/verified-badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/hooks/use-auth'
import { useMutedIds, useTopProfiles } from '@/hooks/use-pootd'
import { formatCount } from '@/lib/format'
import { isVerified } from '@/lib/verified'

/** How many members the first-run step asks for. */
const FOLLOW_GOAL = 3
const CANDIDATE_LIMIT = 8

function storageKeyFor(userId: string) {
  return `pootd-onboarding:${userId}`
}

/**
 * One-time first-run step: follow a few members so the following feed and
 * Explore have something to work with. It is only offered to accounts that do
 * not follow anyone yet and that have not dismissed it before, so existing
 * members are never interrupted.
 */
export function FollowStep() {
  const { user, profile, loading } = useAuth()
  const { data, isLoading } = useTopProfiles(CANDIDATE_LIMIT)
  const mutedIds = useMutedIds()
  const [open, setOpen] = useState(false)
  const [followed, setFollowed] = useState<Set<string>>(new Set())

  const candidates = useMemo(
    () =>
      (data ?? []).filter(
        (candidate) =>
          candidate.id !== profile?.id &&
          !(mutedIds.data ?? []).includes(candidate.id),
      ),
    [data, mutedIds.data, profile?.id],
  )

  const goal = Math.min(FOLLOW_GOAL, candidates.length)
  const done = followed.size >= goal

  useEffect(() => {
    if (open || loading || !user || !profile) return
    if (profile.following_count > 0) return
    if (candidates.length === 0) return

    try {
      if (window.localStorage.getItem(storageKeyFor(user.id))) return
    } catch {
      // Storage blocked (private mode) — do not nag on every visit.
      return
    }

    // A one-way latch: once the step is offered it must stay open even after the
    // reader follows someone (which flips `following_count` mid-flow), so this is
    // synchronising with localStorage rather than deriving state.
    // oxlint-disable-next-line react/set-state-in-effect
    setOpen(true)
  }, [open, loading, user, profile, candidates.length])

  function remember() {
    if (!user) return
    try {
      window.localStorage.setItem(storageKeyFor(user.id), '1')
    } catch {
      // Ignore: the step simply appears again next time.
    }
  }

  function close() {
    setOpen(false)
    remember()
  }

  function handleFollowed(targetId: string, following: boolean) {
    setFollowed((current) => {
      const next = new Set(current)
      if (following) next.add(targetId)
      else next.delete(targetId)
      return next
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) close()
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-md"
      >
        <DialogHeader className="px-5 pb-3 pt-5">
          <span className="flex size-10 items-center justify-center rounded-full bg-secondary text-foreground">
            <HugeiconsIcon icon={UserAdd01Icon} className="size-5" />
          </span>
          <DialogTitle className="mt-2 text-base">اختر أعضاء تتابعهم</DialogTitle>
          <DialogDescription className="text-sm leading-6">
            متابعة 3 أعضاء تكفي عشان تبدأ الرئيسية تعرض لك ما يهمك، ويصير
            استكشف مفيد أكثر.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto border-y border-border">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="flex items-center gap-3 border-b border-border px-5 py-3 last:border-b-0"
              >
                <Skeleton className="size-9 shrink-0 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-8 w-20 rounded-full" />
              </div>
            ))
          ) : (
            candidates.map((candidate) => (
              <div
                key={candidate.id}
                className="flex items-center gap-3 border-b border-border px-5 py-3 last:border-b-0"
              >
                <Link
                  to={`/u/${candidate.username}`}
                  onClick={close}
                  aria-label={`عرض ملف ${candidate.display_name}`}
                  className="shrink-0"
                >
                  <UserAvatar profile={candidate} className="size-9" />
                </Link>

                <div className="min-w-0 flex-1">
                  <Link
                    to={`/u/${candidate.username}`}
                    onClick={close}
                    dir="auto"
                    className="flex min-w-0 items-center gap-1 text-sm font-medium transition-colors hover:underline"
                  >
                    <span className="truncate">{candidate.display_name}</span>
                    {isVerified(candidate.username) ? (
                      <VerifiedBadge className="size-3.5" />
                    ) : null}
                  </Link>
                  <p className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
                    <span dir="ltr" className="truncate">
                      @{candidate.username}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="shrink-0">
                      {formatCount(candidate.followers_count)} متابع
                    </span>
                  </p>
                </div>

                <FollowButton
                  targetUserId={candidate.id}
                  onFollowed={(following) =>
                    handleFollowed(candidate.id, following)
                  }
                />
              </div>
            ))
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-4">
          <p
            aria-live="polite"
            className="flex items-center gap-1.5 text-xs text-muted-foreground"
          >
            {done ? (
              <HugeiconsIcon
                icon={CheckmarkCircle02Icon}
                className="size-4 text-foreground"
              />
            ) : null}
            {done
              ? 'تم! الرئيسية جاهزة.'
              : `${followed.size} من ${goal} متابعين`}
          </p>
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={close}>
              لاحقًا
            </Button>
            <Button type="button" size="sm" onClick={close} disabled={!done}>
              ابدأ التصفّح
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
