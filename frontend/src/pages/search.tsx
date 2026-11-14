import { useEffect, useMemo, useState } from 'react'
import { Loader2, Search } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { EmptyState } from '@/components/empty-state'
import { PostList } from '@/components/post/post-list'
import { UserAvatar } from '@/components/user-avatar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useBookmarkedPostIds,
  useLikedPostIds,
  useSearchPosts,
  useSearchProfiles,
} from '@/hooks/use-pootd'
import { sanitizeSearchTerm } from '@/lib/validation'

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const urlQuery = searchParams.get('q') ?? ''
  const [value, setValue] = useState(urlQuery)
  const [syncedQuery, setSyncedQuery] = useState(urlQuery)

  // Keep the input in sync with the URL without an extra render pass.
  if (urlQuery !== syncedQuery) {
    setSyncedQuery(urlQuery)
    setValue(urlQuery)
  }

  const query = urlQuery.trim()
  const postsQuery = useSearchPosts(query)
  const profilesQuery = useSearchProfiles(query)

  const postIds = useMemo(
    () => (postsQuery.data ?? []).map((post) => post.id),
    [postsQuery.data],
  )
  const likedIds = useLikedPostIds(postIds)
  const bookmarkedIds = useBookmarkedPostIds(postIds)

  // Debounce the URL so the query stays shareable without firing a request per keystroke.
  useEffect(() => {
    const clean = sanitizeSearchTerm(value)
    if (clean === query) return

    const timer = window.setTimeout(() => {
      setSearchParams(clean ? { q: clean } : {}, { replace: true })
    }, 350)

    return () => window.clearTimeout(timer)
  }, [value, query, setSearchParams])

  const hasQuery = query.length >= 2
  const nothingFound =
    hasQuery &&
    !postsQuery.isLoading &&
    !profilesQuery.isLoading &&
    (postsQuery.data?.length ?? 0) === 0 &&
    (profilesQuery.data?.length ?? 0) === 0

  return (
    <div className="space-y-4">
      <header>
        <h1 className="font-heading text-2xl font-bold tracking-tight">بحث</h1>
        <p className="mt-1 text-sm text-muted-foreground">ابحث في المنشورات والأعضاء.</p>
      </header>

      <div className="grid gap-2">
        <Label htmlFor="search-input" className="sr-only">
          ابحث
        </Label>
        <div className="relative">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="search-input"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="اكتب كلمة للبحث…"
            autoComplete="off"
            autoFocus
            className="ps-9 pe-9"
          />
          {postsQuery.isFetching || profilesQuery.isFetching ? (
            <Loader2 className="absolute end-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          ) : null}
        </div>
      </div>

      {!hasQuery ? (
        <EmptyState
          title="ابحث في بوتد"
          description="اكتب كلمتين على الأقل عشان نطلع لك المنشورات والأعضاء المطابقين."
        />
      ) : null}

      {profilesQuery.data && profilesQuery.data.length > 0 ? (
        <section>
          <h2 className="mb-3 text-sm font-semibold">الأعضاء</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {profilesQuery.data.map((profile) => (
              <Card key={profile.id} className="flex items-center gap-3 p-3.5">
                <Link to={`/u/${profile.username}`} className="shrink-0">
                  <UserAvatar profile={profile} className="size-10" />
                </Link>
                <div className="min-w-0">
                  <Link
                    to={`/u/${profile.username}`}
                    dir="auto"
                    className="block truncate text-sm font-semibold transition-colors hover:underline"
                  >
                    {profile.display_name}
                  </Link>
                  <span dir="ltr" className="block truncate text-xs text-muted-foreground">
                    @{profile.username}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {hasQuery ? (
        <section>
          <h2 className="mb-3 text-sm font-semibold">المنشورات</h2>
          <PostList
            posts={postsQuery.data}
            isLoading={postsQuery.isLoading}
            error={postsQuery.error}
            likedIds={likedIds.data}
            bookmarkedIds={bookmarkedIds.data}
            onRetry={() => void postsQuery.refetch()}
            emptyTitle="ما فيه منشورات"
            emptyDescription="ما لقينا منشورات تطابق بحثك."
          />
        </section>
      ) : null}

      {nothingFound ? (
        <div className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          ما لقينا أي شيء لـ «{query}».
        </div>
      ) : null}

      {postsQuery.isLoading || profilesQuery.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
      ) : null}

      {!hasQuery ? (
        <Card className="p-4">
          <p className="text-sm leading-7 text-muted-foreground">
            جرّب تبحث عن وسم مثل <span dir="ltr">hacking</span> أو اسم عضو.
          </p>
          <Button asChild variant="outline" size="sm" className="mt-3">
            <Link to="/explore">استكشف الوسوم</Link>
          </Button>
        </Card>
      ) : null}
    </div>
  )
}
