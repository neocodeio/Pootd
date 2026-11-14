import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Composer } from '@/components/post/composer'
import { PostList } from '@/components/post/post-list'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/hooks/use-auth'
import { useFeed, useBookmarkedPostIds, useLikedPostIds } from '@/hooks/use-pootd'
import type { SortOption } from '@/lib/types'

export function FeedPage() {
  const { user } = useAuth()
  const location = useLocation()
  const [sort, setSort] = useState<SortOption>('new')
  const feed = useFeed(undefined, sort)
  const likedIds = useLikedPostIds(feed.data?.map((post) => post.id) ?? [])
  const bookmarkedIds = useBookmarkedPostIds(feed.data?.map((post) => post.id) ?? [])

  return (
    <div className="space-y-4">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">الرئيسية</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {sort === 'new' ? 'آخر ما ينشره المجتمع.' : 'المنشورات الأكثر إعجابًا.'}
          </p>
        </div>
        <Tabs value={sort} onValueChange={(value) => setSort(value as SortOption)}>
          <TabsList>
            <TabsTrigger value="new" className="px-3">
              الأحدث
            </TabsTrigger>
            <TabsTrigger value="top" className="px-3">
              الأعلى
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </header>

      <Composer autoFocus={location.hash === '#compose'} />

      <PostList
        posts={feed.data}
        isLoading={feed.isLoading}
        error={feed.error}
        likedIds={likedIds.data}
        bookmarkedIds={bookmarkedIds.data}
        onRetry={() => void feed.refetch()}
        emptyTitle={sort === 'top' ? 'ما فيه منشورات أعلى بعد' : 'ما فيه منشورات بعد'}
        emptyDescription={
          user
            ? 'كن أول من يبدأ النقاش.'
            : 'انضم للمجتمع وابدأ أول نقاش.'
        }
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
