import { useMemo } from 'react'
import type { ReactNode } from 'react'
import { Loading03Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { EmptyState } from '@/components/empty-state'
import { PostCard } from '@/components/post/post-card'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useMutedIds } from '@/hooks/use-pootd'
import { useInfiniteScroll } from '@/hooks/use-infinite-scroll'
import type { PostWithAuthor } from '@/lib/types'

/** Below this many posts the manual button stays visible as a fallback. */
const SHORT_LIST = 5

function PostSkeleton() {
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex gap-3">
        <Skeleton className="size-10 shrink-0 rounded-full" />
        <div className="flex-1 space-y-2.5">
          <Skeleton className="h-3 w-48" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-6 w-32 rounded-full" />
        </div>
      </div>
    </Card>
  )
}

export function PostList({
  posts,
  isLoading,
  error,
  likedIds,
  bookmarkedIds,
  emptyTitle,
  emptyDescription,
  emptyAction,
  onRetry,
  hasMore = false,
  isLoadingMore = false,
  loadError = false,
  onLoadMore,
  excludeMuted = true,
}: {
  posts: PostWithAuthor[] | undefined
  isLoading: boolean
  error: Error | null
  likedIds: string[] | undefined
  bookmarkedIds?: string[] | undefined
  emptyTitle: string
  emptyDescription?: string
  emptyAction?: ReactNode
  onRetry?: () => void
  hasMore?: boolean
  isLoadingMore?: boolean
  loadError?: boolean
  onLoadMore?: () => void
  excludeMuted?: boolean
}) {
  const mutedIds = useMutedIds()
  const muted = useMemo(
    () => new Set(excludeMuted ? (mutedIds.data ?? []) : []),
    [excludeMuted, mutedIds.data],
  )
  const visiblePosts = useMemo(
    () => (posts ?? []).filter((post) => !muted.has(post.author_id)),
    [posts, muted],
  )

  const { sentinelRef, autoLoad } = useInfiniteScroll({
    hasMore: hasMore && Boolean(onLoadMore),
    isLoading: isLoadingMore,
    hasError: loadError,
    onLoadMore: onLoadMore ?? (() => {}),
  })

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <PostSkeleton key={index} />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <EmptyState
        title="تعذّر تحميل المنشورات"
        description={error.message}
        action={
          onRetry ? (
            <Button type="button" variant="outline" size="sm" onClick={onRetry}>
              حاول مرة ثانية
            </Button>
          ) : undefined
        }
      />
    )
  }

  if (visiblePosts.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
      />
    )
  }

  const liked = new Set(likedIds ?? [])
  const bookmarked = new Set(bookmarkedIds ?? [])

  // Auto-load covers long lists; the button remains for short lists, browsers
  // without IntersectionObserver, and a failed page request.
  const showManualLoad =
    Boolean(hasMore && onLoadMore) &&
    (!autoLoad || loadError || visiblePosts.length < SHORT_LIST)

  return (
    <div className="space-y-3">
      {visiblePosts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          liked={liked.has(post.id)}
          bookmarked={bookmarked.has(post.id)}
        />
      ))}

      {hasMore && onLoadMore ? (
        <div className="pt-1">
          <div ref={sentinelRef} aria-hidden="true" className="h-px w-full" />
          {isLoadingMore ? (
            <p
              role="status"
              className="flex items-center justify-center gap-2 py-3 text-xs text-muted-foreground"
            >
              <HugeiconsIcon
                icon={Loading03Icon}
                className="size-3.5 animate-spin"
                aria-hidden="true"
              />
              جارٍ تحميل المزيد…
            </p>
          ) : showManualLoad ? (
            <div className="flex justify-center">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onLoadMore}
                className="rounded-full px-4 text-xs text-muted-foreground hover:text-foreground"
              >
                حمّل المزيد
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
