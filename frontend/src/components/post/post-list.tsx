import type { ReactNode } from 'react'
import { EmptyState } from '@/components/empty-state'
import { PostCard } from '@/components/post/post-card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { PostWithAuthor } from '@/lib/types'

function PostSkeleton() {
  return (
    <div className="flex gap-3 px-4 py-4 sm:px-5">
      <Skeleton className="size-9 shrink-0 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  )
}

export function PostList({
  posts,
  isLoading,
  error,
  likedIds,
  emptyTitle,
  emptyDescription,
  emptyAction,
  onRetry,
}: {
  posts: PostWithAuthor[] | undefined
  isLoading: boolean
  error: Error | null
  likedIds: string[] | undefined
  emptyTitle: string
  emptyDescription?: string
  emptyAction?: ReactNode
  onRetry?: () => void
}) {
  if (isLoading) {
    return (
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="divide-y divide-border">
          {Array.from({ length: 4 }).map((_, index) => (
            <PostSkeleton key={index} />
          ))}
        </div>
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

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="divide-y divide-border">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} liked={liked.has(post.id)} />
        ))}
      </div>
    </div>
  )
}
