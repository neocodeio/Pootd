import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import {
  Cancel01Icon,
  Loading03Icon,
  Search01Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Link, useSearchParams } from 'react-router-dom'
import { EmptyState } from '@/components/empty-state'
import { PostList } from '@/components/post/post-list'
import { TopUsers } from '@/components/profile/top-users'
import { TrendingTags } from '@/components/trending-tags'
import { UserAvatar } from '@/components/user-avatar'
import { VerifiedBadge } from '@/components/verified-badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  useBookmarkedPostIds,
  useFeed,
  useLikedPostIds,
  useMutedIds,
  useSearchPosts,
  useSearchProfiles,
} from '@/hooks/use-pootd'
import { flattenPages } from '@/lib/pagination'
import { sanitizeSearchTerm } from '@/lib/validation'
import { isVerified } from '@/lib/verified'

type PostsQuery = ReturnType<typeof useSearchPosts>
type ProfilesQuery = ReturnType<typeof useSearchProfiles>

/**
 * Explore is the search hub: the query lives in `?q=` so a search stays
 * shareable and the back button works, exactly like the old search page.
 */
export function ExplorePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const urlQuery = searchParams.get('q') ?? ''
  const [value, setValue] = useState(urlQuery)
  const [syncedQuery, setSyncedQuery] = useState(urlQuery)
  const inputRef = useRef<HTMLInputElement>(null)

  // Keep the input in sync with the URL without an extra render pass.
  if (urlQuery !== syncedQuery) {
    setSyncedQuery(urlQuery)
    setValue(urlQuery)
  }

  const query = urlQuery.trim()
  const hasQuery = query.length >= 2
  const typed = sanitizeSearchTerm(value)

  // Debounce the URL so the query stays shareable without firing a request per keystroke.
  useEffect(() => {
    if (typed === query) return

    const timer = window.setTimeout(() => {
      setSearchParams(typed ? { q: typed } : {}, { replace: true })
    }, 350)

    return () => window.clearTimeout(timer)
  }, [typed, query, setSearchParams])

  const postsQuery = useSearchPosts(query)
  const profilesQuery = useSearchProfiles(query)
  const isSearching = postsQuery.isFetching || profilesQuery.isFetching

  function apply(next: string) {
    setSearchParams(next ? { q: next } : {}, { replace: true })
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    apply(typed)
  }

  function handleClear() {
    setValue('')
    apply('')
    inputRef.current?.focus()
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          استكشف
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          ابحث في المنشورات والأعضاء، وتابع ما يتحدث عنه المجتمع.
        </p>
      </header>

      <form role="search" onSubmit={handleSubmit} className="grid gap-2">
        <Label htmlFor="explore-search" className="sr-only">
          ابحث في بوتد
        </Label>
        <div className="relative">
          <HugeiconsIcon
            icon={Search01Icon}
            className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            ref={inputRef}
            id="explore-search"
            type="text"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="ابحث في المنشورات والأعضاء…"
            autoComplete="off"
            enterKeyHint="search"
            className="ps-9 pe-11"
          />
          {isSearching ? (
            <HugeiconsIcon
              icon={Loading03Icon}
              className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground"
            />
          ) : value ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={handleClear}
              aria-label="مسح البحث"
              className="absolute end-1 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <HugeiconsIcon icon={Cancel01Icon} className="size-4" />
            </Button>
          ) : null}
        </div>
        {typed.length === 1 ? (
          <p className="text-xs text-muted-foreground">
            اكتب حرفين على الأقل عشان نبحث.
          </p>
        ) : null}
      </form>

      {hasQuery ? (
        <SearchResults
          query={query}
          postsQuery={postsQuery}
          profilesQuery={profilesQuery}
        />
      ) : (
        <ExploreFeed />
      )}
    </div>
  )
}

function ExploreFeed() {
  const feed = useFeed(undefined, 'top')
  const posts = flattenPages(feed.data)
  const postIds = useMemo(
    () => (posts ?? []).map((post) => post.id),
    [posts],
  )
  const likedIds = useLikedPostIds(postIds)
  const bookmarkedIds = useBookmarkedPostIds(postIds)

  return (
    <div className="space-y-6">
      <TrendingTags />
      <TopUsers limit={5} />

      <section>
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold">منشورات مميزة</h2>
          <span className="text-xs text-muted-foreground">الأكثر إعجابًا</span>
        </div>
        <PostList
          posts={posts}
          isLoading={feed.isLoading}
          error={feed.error}
          likedIds={likedIds.data}
          bookmarkedIds={bookmarkedIds.data}
          onRetry={() => void feed.refetch()}
          hasMore={feed.hasNextPage}
          isLoadingMore={feed.isFetchingNextPage}
          loadError={feed.isFetchNextPageError}
          onLoadMore={() => void feed.fetchNextPage()}
          emptyTitle="ما فيه منشورات مميزة بعد"
          emptyDescription="تظهر المنشورات الأعلى هنا بعد ما يبدأ المجتمع بالتفاعل."
        />
      </section>
    </div>
  )
}

function SearchResults({
  query,
  postsQuery,
  profilesQuery,
}: {
  query: string
  postsQuery: PostsQuery
  profilesQuery: ProfilesQuery
}) {
  const posts = flattenPages(postsQuery.data)
  const postIds = useMemo(
    () => (posts ?? []).map((post) => post.id),
    [posts],
  )
  const likedIds = useLikedPostIds(postIds)
  const bookmarkedIds = useBookmarkedPostIds(postIds)
  const mutedIds = useMutedIds()
  const profiles = (profilesQuery.data ?? []).filter(
    (profile) => !(mutedIds.data ?? []).includes(profile.id),
  )

  const isLoading = postsQuery.isLoading || profilesQuery.isLoading
  const nothingFound =
    !isLoading && (posts?.length ?? 0) === 0 && profiles.length === 0

  if (nothingFound) {
    return (
      <EmptyState
        title="ما لقينا نتائج"
        description={`ما فيه منشورات أو أعضاء يطابقون «${query}». جرّب كلمة أبسط أو ابحث عن وسم مثل hacking.`}
      />
    )
  }

  return (
    <div className="space-y-6">
      {profiles.length > 0 ? (
        <section>
          <h2 className="mb-3 text-sm font-semibold">الأعضاء</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {profiles.map((profile) => (
              <Card key={profile.id} className="flex items-center gap-3 p-3.5">
                <Link
                  to={`/u/${profile.username}`}
                  aria-label={`عرض ملف ${profile.display_name}`}
                  className="shrink-0"
                >
                  <UserAvatar profile={profile} className="size-10" />
                </Link>
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-1">
                    <Link
                      to={`/u/${profile.username}`}
                      dir="auto"
                      className="truncate text-sm font-semibold transition-colors hover:underline"
                    >
                      {profile.display_name}
                    </Link>
                    {isVerified(profile.username) ? (
                      <VerifiedBadge className="size-3.5" />
                    ) : null}
                  </div>
                  <span
                    dir="ltr"
                    className="block truncate text-xs text-muted-foreground"
                  >
                    @{profile.username}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <h2 className="mb-3 text-sm font-semibold">المنشورات</h2>
        <PostList
          posts={posts}
          isLoading={postsQuery.isLoading}
          error={postsQuery.error}
          likedIds={likedIds.data}
          bookmarkedIds={bookmarkedIds.data}
          onRetry={() => void postsQuery.refetch()}
          hasMore={postsQuery.hasNextPage}
          isLoadingMore={postsQuery.isFetchingNextPage}
          loadError={postsQuery.isFetchNextPageError}
          onLoadMore={() => void postsQuery.fetchNextPage()}
          emptyTitle="ما فيه منشورات"
          emptyDescription="ما لقينا منشورات تطابق بحثك."
        />
      </section>
    </div>
  )
}
