import { Link } from 'react-router-dom'
import { FollowButton } from '@/components/profile/follow-button'
import { UserAvatar } from '@/components/user-avatar'
import { VerifiedBadge } from '@/components/verified-badge'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useTopProfiles } from '@/hooks/use-pootd'
import { formatCount } from '@/lib/format'
import { isVerified } from '@/lib/verified'

/**
 * Most-followed members, shown on Explore as the community leaderboard.
 * Counters come from the profile row (trigger-maintained), never derived.
 */
export function TopUsers({ limit = 5 }: { limit?: number }) {
  const { data, isLoading, error } = useTopProfiles(limit)

  return (
    <section aria-labelledby="top-users-heading">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 id="top-users-heading" className="text-sm font-semibold">
          أبرز الأعضاء
        </h2>
        <span className="text-xs text-muted-foreground">الأكثر متابعة</span>
      </div>

      <Card className="divide-y divide-border overflow-hidden">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="flex items-center gap-3 p-3.5 sm:px-5">
              <Skeleton className="size-10 shrink-0 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-8 w-20 rounded-full" />
            </div>
          ))
        ) : error ? (
          <p className="p-4 text-sm text-muted-foreground">
            تعذّر تحميل الأعضاء البارزين.
          </p>
        ) : (data?.length ?? 0) === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">
            ما فيه أعضاء بعد. أول من ينضم ياخذ الصدارة.
          </p>
        ) : (
          data?.map((profile) => (
            <div key={profile.id} className="flex items-center gap-3 p-3.5 sm:px-5">
              <Link
                to={`/u/${profile.username}`}
                aria-label={`عرض ملف ${profile.display_name}`}
                className="shrink-0"
              >
                <UserAvatar profile={profile} className="size-10" />
              </Link>

              <div className="min-w-0 flex-1">
                <Link
                  to={`/u/${profile.username}`}
                  dir="auto"
                  className="flex min-w-0 items-center gap-1 text-sm font-semibold transition-colors hover:underline"
                >
                  <span className="truncate">{profile.display_name}</span>
                  {isVerified(profile.username) ? (
                    <VerifiedBadge className="size-3.5" />
                  ) : null}
                </Link>
                <p className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
                  <span dir="ltr" className="truncate">
                    @{profile.username}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="shrink-0">
                    {formatCount(profile.followers_count)} متابع
                  </span>
                </p>
              </div>

              <FollowButton targetUserId={profile.id} />
            </div>
          ))
        )}
      </Card>
    </section>
  )
}
