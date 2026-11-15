import { useEffect, useRef } from 'react'
import { ArrowRight } from 'lucide-react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { EmptyState } from '@/components/empty-state'
import { CommentSection } from '@/components/post/comment-section'
import { PostCard } from '@/components/post/post-card'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { usePost, useBookmarkedPostIds, usePostLiked } from '@/hooks/use-pootd'

export function PostPage() {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const postQuery = usePost(id ?? '')
  const likedQuery = usePostLiked(id ?? '')
  const bookmarkedIds = useBookmarkedPostIds(id ? [id] : [])
  const post = postQuery.data
  const scrolledFor = useRef<string | null>(null)

  useEffect(() => {
    if (location.hash !== '#comments') {
      scrolledFor.current = null
      return
    }
    if (!post || scrolledFor.current === post.id) return

    const target = document.getElementById('comments')
    if (!target) return

    scrolledFor.current = post.id
    target.scrollIntoView({ block: 'start' })
  }, [location.hash, post])

  return (
    <div className="space-y-4">
      <header>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowRight className="size-4" />
          الرئيسية
        </Link>
      </header>

      {postQuery.isLoading ? (
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
      ) : postQuery.error ? (
        <EmptyState title="تعذّر تحميل المنشور" description={postQuery.error.message} />
      ) : !post ? (
        <EmptyState
          title="المنشور غير موجود"
          description="يمكن حُذف، أو الرابط غير صحيح."
          action={
            <Button asChild variant="outline" size="sm">
              <Link to="/">العودة للرئيسية</Link>
            </Button>
          }
        />
      ) : (
        <>
          <PostCard
            post={post}
            liked={likedQuery.data ?? false}
            bookmarked={bookmarkedIds.data?.includes(post.id) ?? false}
            detail
          />
          <CommentSection
            postId={post.id}
            postAuthorId={post.author_id}
            commentCount={post.comment_count}
          />
        </>
      )}
    </div>
  )
}
