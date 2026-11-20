import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Composer } from '@/components/post/composer'
import { PostList } from '@/components/post/post-list'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/hooks/use-auth'
import {
  useBookmarkedPostIds,
  useFeed,
  useFollowingFeed,
  useLikedPostIds,
} from '@/hooks/use-pootd'
import { flattenPages } from '@/lib/pagination'

/** «الكل» is everything, «متابعات» the members you follow, «الأعلى» most liked. */
type FeedScope = 'all' | 'following' | 'top'

const SUBTITLES: Record<FeedScope, string> = {
  all: 'آخر ما ينشره المجتمع.',
  following: 'آخر ما ينشره من تتابعهم.',
  top: 'المنشورات الأكثر إعجابًا.',
}

export function FeedPage() {
  const { user } = useAuth()
  const location = useLocation()
  const [scope, setScope] = useState<FeedScope>('all')
  // «متابعات» only exists for signed-in members; signing out falls back to «الكل».
  const active: FeedScope = scope === 'following' && !user ? 'all' : scope

  const allFeed = useFeed(undefined, 'new', active === 'all')
  const topFeed = useFeed(undefined, 'top', active === 'top')
  const followingFeed = useFollowingFeed(active === 'following')
  const feed = active === 'following' ? followingFeed : active === 'top' ? topFeed : allFeed

  const posts = flattenPages(feed.data)
  const likedIds = useLikedPostIds(posts?.map((post) => post.id) ?? [])
  const bookmarkedIds = useBookmarkedPostIds(posts?.map((post) => post.id) ?? [])

  const noFollows = active === 'following' && followingFeed.followingCount === 0
  const emptyTitle = noFollows
    ? 'لم تتابع أحدًا بعد'
    : active === 'following'
      ? 'ما فيه منشورات من متابعاتك بعد'
      : active === 'top'
        ? 'ما فيه منشورات أعلى بعد'
        : 'ما فيه منشورات بعد'
  const emptyDescription = noFollows
    ? 'تابع أعضاء من صفحة الاستكشاف، وتظهر منشوراتهم هنا أول بأول.'
    : active === 'following'
      ? 'منشورات من تتابعهم تظهر هنا أول بأول.'
      : user
        ? 'كن أول من يبدأ النقاش.'
        : 'انضم للمجتمع وابدأ أول نقاش.'

  return (
    <div className="space-y-4">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="sr-only">الرئيسية</h1>
          <p className="mt-1 text-sm text-muted-foreground">{SUBTITLES[active]}</p>
        </div>
        <Tabs value={active} onValueChange={(value) => setScope(value as FeedScope)}>
          <TabsList>
            <TabsTrigger value="all" className="px-3.5">
              الكل
            </TabsTrigger>
            {user ? (
              <TabsTrigger value="following" className="px-3.5">
                اتابعه
              </TabsTrigger>
            ) : null}
            <TabsTrigger value="top" className="px-3.5">
              الأعلى
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </header>

      <Composer autoFocus={location.hash === '#compose'} />

      <PostList
        posts={posts}
        isLoading={
          feed.isLoading || (active === 'following' && followingFeed.isPreparing)
        }
        error={
          feed.error ??
          (active === 'following' ? followingFeed.followingError : null)
        }
        likedIds={likedIds.data}
        bookmarkedIds={bookmarkedIds.data}
        onRetry={() => void feed.refetch()}
        hasMore={feed.hasNextPage}
        isLoadingMore={feed.isFetchingNextPage}
        loadError={feed.isFetchNextPageError}
        onLoadMore={() => void feed.fetchNextPage()}
        emptyTitle={emptyTitle}
        emptyDescription={emptyDescription}
        emptyAction={
          noFollows ? (
            <Button asChild size="sm">
              <Link to="/explore">استكشف الأعضاء</Link>
            </Button>
          ) : (
            <Button asChild size="sm">
              <Link to={user ? '/#compose' : '/signup'}>
                {user ? 'اكتب منشورًا' : 'أنشئ حسابًا'}
              </Link>
            </Button>
          )
        }
      />
    </div>
  )
}
