import type { ReactNode } from 'react'
import { EmptyState } from '@/components/empty-state'
import { PostCard } from '@/components/post/post-card'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { PostWithAuthor } from '@/lib/types'

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
}) {
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

  if (!posts || posts.length === 0) {
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

  return (
    <div className="space-y-3">
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          liked={liked.has(post.id)}
          bookmarked={bookmarked.has(post.id)}
        />
      ))}
    </div>
  )
}
