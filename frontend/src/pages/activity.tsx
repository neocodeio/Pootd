import type { ReactNode } from 'react'
import {
  ChevronLeftIcon,
  Comment01Icon,
  FavouriteIcon,
  Image01Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Link } from 'react-router-dom'
import { UserAvatar } from '@/components/user-avatar'
import { VerifiedBadge } from '@/components/verified-badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/hooks/use-auth'
import {
  useFollowingFeed,
  useMutedIds,
  useProfileStats,
  useUserPosts,
} from '@/hooks/use-pootd'
import { formatCount, formatJoined, timeAgo } from '@/lib/format'
import { flattenPages } from '@/lib/pagination'
import type { PostWithAuthor } from '@/lib/types'
import { isVerified } from '@/lib/verified'

const ROW_LIMIT = 3

function SectionHeading({
  id,
  title,
  children,
}: {
  id: string
  title: string
  children?: ReactNode
}) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2 id={id} className="text-sm font-semibold">
        {title}
      </h2>
      {children}
    </div>
  )
}

function StatTile({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="bg-card px-4 py-3">
      <p className="text-[11px] leading-4 text-muted-foreground">{label}</p>
      {value === null ? (
        <Skeleton className="mt-1.5 h-6 w-10" />
      ) : (
        <p className="mt-0.5 text-xl font-semibold leading-7 tabular-nums">
          {value}
        </p>
      )}
    </div>
  )
}

function RowSkeleton({ withAvatar = true }: { withAvatar?: boolean }) {
  return (
    <div className="flex gap-3 p-4 sm:px-5">
      {withAvatar ? <Skeleton className="size-9 shrink-0 rounded-full" /> : null}
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3 w-2/5" />
        <Skeleton className="h-3 w-full" />
      </div>
    </div>
  )
}

function SectionEmpty({
  text,
  action,
}: {
  text: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-start gap-3 p-4 sm:px-5">
      <p className="text-sm text-muted-foreground">{text}</p>
      {action}
    </div>
  )
}

function SectionError({ text, onRetry }: { text: string; onRetry: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2 p-4 sm:px-5">
      <p className="text-sm text-muted-foreground">{text}</p>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onRetry}
        className="rounded-full px-3 text-xs text-muted-foreground hover:text-foreground"
      >
        حاول مرة ثانية
      </Button>
    </div>
  )
}

/** A post from a member you follow: author line, excerpt, then the time. */
function FollowingRow({ post }: { post: PostWithAuthor }) {
  return (
    <Link
      to={`/p/${post.id}`}
      className="flex gap-3 p-4 transition-colors hover:bg-secondary/40 sm:px-5"
    >
      <UserAvatar profile={post.author} className="size-9" />
      <div className="min-w-0 flex-1">
        <p className="flex min-w-0 flex-wrap items-center gap-x-1.5 text-sm leading-6">
          <span dir="auto" className="max-w-full truncate font-semibold">
            {post.author.display_name}
          </span>
          {isVerified(post.author.username) ? (
            <VerifiedBadge className="size-3.5" />
          ) : null}
          <span dir="ltr" className="truncate text-xs text-muted-foreground">
            @{post.author.username}
          </span>
          <span aria-hidden="true" className="text-xs text-muted-foreground">
            ·
          </span>
          <span className="shrink-0 text-xs text-muted-foreground">
            {timeAgo(post.created_at)}
          </span>
        </p>
        <p
          dir="auto"
          className="mt-1 line-clamp-2 whitespace-pre-wrap break-words text-[14px] leading-7 text-foreground/90"
        >
          {post.content}
        </p>
      </div>
      <HugeiconsIcon
        icon={ChevronLeftIcon}
        className="mt-1 size-4 shrink-0 text-muted-foreground/60"
        aria-hidden="true"
      />
    </Link>
  )
}

/** One of your own posts with the counters that live on the row. */
function ContributionRow({ post }: { post: PostWithAuthor }) {
  return (
    <Link
      to={`/p/${post.id}`}
      className="flex items-start gap-3 p-4 transition-colors hover:bg-secondary/40 sm:px-5"
    >
      <div className="min-w-0 flex-1">
        <p
          dir="auto"
          className="line-clamp-3 whitespace-pre-wrap break-words text-sm leading-7 text-foreground/95"
        >
          {post.content}
        </p>
        <p className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted-foreground">
          <span>{timeAgo(post.created_at)}</span>
          <span className="inline-flex items-center gap-1 tabular-nums">
            <HugeiconsIcon
              icon={FavouriteIcon}
              className="size-3.5"
              aria-hidden="true"
            />
            {formatCount(post.like_count)}
          </span>
          <span className="inline-flex items-center gap-1 tabular-nums">
            <HugeiconsIcon
              icon={Comment01Icon}
              className="size-3.5"
              aria-hidden="true"
            />
            {formatCount(post.comment_count)}
          </span>
          {post.image_url ? (
            <span className="inline-flex items-center gap-1">
              <HugeiconsIcon
                icon={Image01Icon}
                className="size-3.5"
                aria-hidden="true"
              />
              صورة
            </span>
          ) : null}
        </p>
      </div>
      <HugeiconsIcon
        icon={ChevronLeftIcon}
        className="mt-1 size-4 shrink-0 text-muted-foreground/60"
        aria-hidden="true"
      />
    </Link>
  )
}

/**
 * The member's own dashboard: trigger-maintained counts, the newest posts from
 * the people they follow (muted members and their own posts removed) and the
 * newest of their own posts. Signed-in only; reached from the account menu.
 */
export function ActivityPage() {
  const { user, profile } = useAuth()
  const statsQuery = useProfileStats(user?.id)
  const postsQuery = useUserPosts(user?.id)
  const following = useFollowingFeed()
  const muted = useMutedIds()

  const stats = statsQuery.data
  const contributions = (flattenPages(postsQuery.data) ?? []).slice(0, ROW_LIMIT)
  const mutedIds = muted.data ?? []
  const followedPosts = (flattenPages(following.data) ?? [])
    .filter(
      (post) =>
        post.author_id !== user?.id && !mutedIds.includes(post.author_id),
    )
    .slice(0, ROW_LIMIT)
  const followingError = following.followingError ?? following.error
  const followingPreparing = following.isPreparing || following.isLoading

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight">
            لوحة النشاط
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            إحصائياتك، وآخر مساهماتك، ومنشورات من تتابعهم.
          </p>
        </div>
        {profile ? (
          <span className="text-xs text-muted-foreground">
            عضو منذ {formatJoined(profile.created_at)}
          </span>
        ) : null}
      </header>

      <section aria-labelledby="activity-stats-heading">
        <SectionHeading id="activity-stats-heading" title="إحصائياتك" />
        <Card className="grid grid-cols-2 gap-px overflow-hidden bg-border sm:grid-cols-4">
          <StatTile
            label="المنشورات"
            value={stats ? formatCount(stats.posts) : null}
          />
          <StatTile
            label="الإعجابات"
            value={stats ? formatCount(stats.likes) : null}
          />
          <StatTile
            label="التعليقات"
            value={stats ? formatCount(stats.comments) : null}
          />
          <StatTile
            label="المتابعون"
            value={profile ? formatCount(profile.followers_count) : null}
          />
        </Card>
        {statsQuery.error ? (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <p className="text-xs text-muted-foreground">
              تعذّر تحميل الإحصائيات.
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void statsQuery.refetch()}
              className="rounded-full px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              حاول مرة ثانية
            </Button>
          </div>
        ) : null}
      </section>

      <section aria-labelledby="activity-following-heading">
        <SectionHeading id="activity-following-heading" title="من متابعاتك">
          <Link
            to="/explore"
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            استكشف الأعضاء
          </Link>
        </SectionHeading>
        <Card className="divide-y divide-border overflow-hidden">
          {followingPreparing ? (
            Array.from({ length: ROW_LIMIT }).map((_, index) => (
              <RowSkeleton key={index} />
            ))
          ) : followingError ? (
            <SectionError
              text="تعذّر تحميل منشورات متابعاتك."
              onRetry={() => void following.refetch()}
            />
          ) : followedPosts.length === 0 ? (
            following.followingCount === 0 ? (
              <SectionEmpty
                text="لم تتابع أحدًا بعد."
                action={
                  <Button asChild variant="outline" size="sm" className="rounded-full">
                    <Link to="/explore">استكشف الأعضاء</Link>
                  </Button>
                }
              />
            ) : (
              <SectionEmpty text="ما فيه منشورات من متابعاتك بعد." />
            )
          ) : (
            followedPosts.map((post) => (
              <FollowingRow key={post.id} post={post} />
            ))
          )}
        </Card>
      </section>

      <section aria-labelledby="activity-contributions-heading">
        <SectionHeading id="activity-contributions-heading" title="مساهماتك">
          {profile ? (
            <Link
              to={`/u/${profile.username}`}
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              كل منشوراتك
            </Link>
          ) : null}
        </SectionHeading>
        <Card className="divide-y divide-border overflow-hidden">
          {postsQuery.isLoading ? (
            Array.from({ length: ROW_LIMIT }).map((_, index) => (
              <RowSkeleton key={index} withAvatar={false} />
            ))
          ) : postsQuery.error ? (
            <SectionError
              text="تعذّر تحميل منشوراتك."
              onRetry={() => void postsQuery.refetch()}
            />
          ) : contributions.length === 0 ? (
            <SectionEmpty
              text="ما نشرت شي بعد."
              action={
                <Button asChild size="sm" className="rounded-full">
                  <Link to="/#compose">اكتب منشورًا</Link>
                </Button>
              }
            />
          ) : (
            contributions.map((post) => (
              <ContributionRow key={post.id} post={post} />
            ))
          )}
        </Card>
      </section>
    </div>
  )
}
