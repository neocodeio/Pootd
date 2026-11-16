import { ArrowRight01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Link, useParams } from 'react-router-dom'
import { PostList } from '@/components/post/post-list'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/use-auth'
import { useBookmarkedPostIds, useFeed, useLikedPostIds } from '@/hooks/use-pootd'
import { flattenPages } from '@/lib/pagination'
import { normalizeTag } from '@/lib/validation'

export function TagPage() {
  const { tag } = useParams<{ tag: string }>()
  const { user } = useAuth()
  const normalizedTag = normalizeTag(tag ?? '')
  const feed = useFeed(normalizedTag || undefined, 'new')
  const posts = flattenPages(feed.data)
  const likedIds = useLikedPostIds(posts?.map((post) => post.id) ?? [])
  const bookmarkedIds = useBookmarkedPostIds(posts?.map((post) => post.id) ?? [])

  return (
    <div className="space-y-4">
      <header>
        <Link
          to="/explore"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <HugeiconsIcon icon={ArrowRight01Icon} className="size-4" />
          استكشف
        </Link>
        <h1 dir="auto" className="mt-3 text-start font-heading text-2xl font-semibold tracking-tight">
          #{normalizedTag}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          أحدث المنشورات بهذا الوسم.
        </p>
      </header>

      <PostList
        posts={posts}
        isLoading={feed.isLoading}
        error={feed.error}
        likedIds={likedIds.data}
        bookmarkedIds={bookmarkedIds.data}
        onRetry={() => void feed.refetch()}
        hasMore={feed.hasNextPage}
        isLoadingMore={feed.isFetchingNextPage}
        onLoadMore={() => void feed.fetchNextPage()}
        emptyTitle={`ما فيه منشورات بوسم #${normalizedTag}`}
        emptyDescription="كن أول من ينشر عن هذا الموضوع."
        emptyAction={
          <Button asChild size="sm">
            <Link to={user ? '/#compose' : '/signup'}>
              {user ? 'اكتب منشورًا' : 'أنشئ حسابًا'}
            </Link>
          </Button>
        }
      />
    </div>
  )
}
