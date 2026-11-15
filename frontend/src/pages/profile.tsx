import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { EmptyState } from '@/components/empty-state'
import { PostList } from '@/components/post/post-list'
import { ProfileHeader } from '@/components/profile/profile-header'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/hooks/use-auth'
import {
  useBookmarkedPostIds,
  useBookmarkedPosts,
  useBookmarkedPostsCount,
  useLikedPostIds,
  useLikedPosts,
  useLikedPostsCount,
  useProfile,
  useProfileStats,
  useUserPosts,
} from '@/hooks/use-pootd'
import { formatCount } from '@/lib/format'
import { flattenPages } from '@/lib/pagination'

type ProfileTab = 'posts' | 'likes' | 'saved'

function ProfileSkeleton() {
  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="px-4 pb-4 sm:px-5">
          <div className="flex items-start justify-between gap-3 pt-4">
            <Skeleton className="size-20 rounded-full sm:size-24" />
            <Skeleton className="h-8 w-24 rounded-md" />
          </div>
          <div className="mt-3 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
          <div className="mt-4 flex gap-6 border-t border-border pt-3">
            <Skeleton className="h-8 w-14" />
            <Skeleton className="h-8 w-14" />
            <Skeleton className="h-8 w-14" />
          </div>
        </div>
      </div>
      <Skeleton className="h-9 w-52 rounded-md" />
      {Array.from({ length: 2 }).map((_, index) => (
        <div
          key={index}
          className="flex gap-3 rounded-xl border border-border bg-card px-4 py-4"
        >
          <Skeleton className="size-9 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function ProfilePage() {
  const { username } = useParams<{ username: string }>()
  const { user } = useAuth()
  const [tab, setTab] = useState<ProfileTab>('posts')

  const profileQuery = useProfile(username)
  const profile = profileQuery.data
  const isOwn = Boolean(user && profile && user.id === profile.id)
  const postsQuery = useUserPosts(profile?.id)
  const likedPostsQuery = useLikedPosts(profile?.id)
  const statsQuery = useProfileStats(profile?.id)
  const savedQuery = useBookmarkedPosts(isOwn ? profile?.id : undefined)
  const likedCountQuery = useLikedPostsCount(profile?.id)
  const savedCountQuery = useBookmarkedPostsCount(isOwn ? profile?.id : undefined)

  const posts = flattenPages(postsQuery.data)
  const likedPosts = flattenPages(likedPostsQuery.data)
  const savedPosts = flattenPages(savedQuery.data)

  const allPostIds = [
    ...(posts?.map((post) => post.id) ?? []),
    ...(likedPosts?.map((post) => post.id) ?? []),
    ...(savedPosts?.map((post) => post.id) ?? []),
  ]
  const likedIdsQuery = useLikedPostIds(allPostIds)
  const bookmarkedIdsQuery = useBookmarkedPostIds(allPostIds)

  if (profileQuery.isLoading) return <ProfileSkeleton />

  if (profileQuery.error) {
    return (
      <EmptyState
        title="تعذّر تحميل الملف"
        description={profileQuery.error.message}
        action={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void profileQuery.refetch()}
          >
            حاول مرة ثانية
          </Button>
        }
      />
    )
  }

  if (!profile) {
    return (
      <EmptyState
        title="الملف غير موجود"
        description="اسم المستخدم غير موجود، أو الحساب انحذف."
        action={
          <Button asChild variant="outline" size="sm">
            <Link to="/explore">استكشف المجتمع</Link>
          </Button>
        }
      />
    )
  }

  return (
    <div className="space-y-4">
      <ProfileHeader profile={profile} stats={statsQuery.data} isOwn={isOwn} />

      <Tabs value={tab} onValueChange={(value) => setTab(value as ProfileTab)}>
        <TabsList
          variant="line"
          className="h-auto w-full justify-start gap-5 border-b border-border"
        >
          <TabsTrigger
            value="posts"
            className="h-auto flex-none rounded-none px-0 pb-2.5 pt-1 text-sm after:bottom-[-1px]"
          >
            المنشورات
            <span className="text-xs tabular-nums text-muted-foreground">
              {statsQuery.data ? formatCount(statsQuery.data.posts) : '—'}
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="likes"
            className="h-auto flex-none rounded-none px-0 pb-2.5 pt-1 text-sm after:bottom-[-1px]"
          >
            الإعجابات
            <span className="text-xs tabular-nums text-muted-foreground">
              {likedCountQuery.data !== undefined
                ? formatCount(likedCountQuery.data)
                : '—'}
            </span>
          </TabsTrigger>
          {isOwn ? (
            <TabsTrigger
              value="saved"
              className="h-auto flex-none rounded-none px-0 pb-2.5 pt-1 text-sm after:bottom-[-1px]"
            >
              المحفوظات
              <span className="text-xs tabular-nums text-muted-foreground">
                {savedCountQuery.data !== undefined
                  ? formatCount(savedCountQuery.data)
                  : '—'}
              </span>
            </TabsTrigger>
          ) : null}
        </TabsList>
      </Tabs>

      {tab === 'posts' ? (
        <PostList
          posts={posts}
          isLoading={postsQuery.isLoading}
          error={postsQuery.error}
          likedIds={likedIdsQuery.data}
          bookmarkedIds={bookmarkedIdsQuery.data}
          onRetry={() => void postsQuery.refetch()}
          hasMore={postsQuery.hasNextPage}
          isLoadingMore={postsQuery.isFetchingNextPage}
          onLoadMore={() => void postsQuery.fetchNextPage()}
          emptyTitle={isOwn ? 'ما نشرت شي بعد' : 'ما فيه منشورات بعد'}
          emptyDescription={
            isOwn
              ? 'شارك اكتشافًا أو أداة أو سؤالًا مع المجتمع.'
              : 'هذا العضو ما نشر شي بعد.'
          }
          emptyAction={
            isOwn ? (
              <Button asChild size="sm">
                <Link to="/#compose">اكتب منشورًا</Link>
              </Button>
            ) : undefined
          }
        />
      ) : tab === 'likes' ? (
        <PostList
          posts={likedPosts}
          isLoading={likedPostsQuery.isLoading}
          error={likedPostsQuery.error}
          likedIds={likedIdsQuery.data}
          bookmarkedIds={bookmarkedIdsQuery.data}
          onRetry={() => void likedPostsQuery.refetch()}
          hasMore={likedPostsQuery.hasNextPage}
          isLoadingMore={likedPostsQuery.isFetchingNextPage}
          onLoadMore={() => void likedPostsQuery.fetchNextPage()}
          emptyTitle={isOwn ? 'ما أعجبت بشي بعد' : 'ما فيه إعجابات بعد'}
          emptyDescription={
            isOwn
              ? 'المنشورات اللي تعجبك تظهر هنا عشان ترجع لها لاحقًا.'
              : 'تظهر هنا المنشورات اللي أعجب بها هذا العضو.'
          }
        />
      ) : (
        <PostList
          posts={savedPosts}
          isLoading={savedQuery.isLoading}
          error={savedQuery.error}
          likedIds={likedIdsQuery.data}
          bookmarkedIds={bookmarkedIdsQuery.data}
          onRetry={() => void savedQuery.refetch()}
          hasMore={savedQuery.hasNextPage}
          isLoadingMore={savedQuery.isFetchingNextPage}
          onLoadMore={() => void savedQuery.fetchNextPage()}
          emptyTitle="ما فيه منشورات محفوظة"
          emptyDescription="احفظ المنشورات المهمة من زر الحفظ، وتلقاها هنا."
          emptyAction={
            <Button asChild size="sm">
              <Link to="/">تصفح الرئيسية</Link>
            </Button>
          }
        />
      )}
    </div>
  )
}
