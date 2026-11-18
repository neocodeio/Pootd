import { PostList } from '@/components/post/post-list'
import { SuggestedProfiles } from '@/components/profile/suggested-profiles'
import { TrendingTags } from '@/components/trending-tags'
import { useBookmarkedPostIds, useFeed, useLikedPostIds } from '@/hooks/use-pootd'
import { flattenPages } from '@/lib/pagination'

export function ExplorePage() {
  const feed = useFeed(undefined, 'top')
  const posts = flattenPages(feed.data)
  const likedIds = useLikedPostIds(posts?.map((post) => post.id) ?? [])
  const bookmarkedIds = useBookmarkedPostIds(posts?.map((post) => post.id) ?? [])

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-heading text-xl font-semibold tracking-tight">استكشف</h1>
        <p className="mt-1 max-w-lg text-sm leading-7 text-muted-foreground">
          تصفّح ما يتحدث عنه المجتمع، والمنشورات الأكثر تفاعلًا.
        </p>
      </header>

      <SuggestedProfiles />

      <section>
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold">وسوم رائجة</h2>
          <span className="text-xs text-muted-foreground">آخر 30 يومًا</span>
        </div>
        <TrendingTags />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold">الأكثر إعجابًا</h2>
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
          emptyTitle="ما فيه منشورات بعد"
          emptyDescription="تظهر المنشورات الأعلى هنا بعد ما يبدأ المجتمع بالتفاعل."
        />
      </section>
    </div>
  )
}
