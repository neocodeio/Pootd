import { useState } from 'react'
import { ChevronLeft, Link2, MessageSquare, MoreHorizontal, Trash2 } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { LikeButton } from '@/components/post/like-button'
import { UserAvatar } from '@/components/user-avatar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/hooks/use-auth'
import { useDeletePost } from '@/hooks/use-mutations'
import { formatDateTime, timeAgo } from '@/lib/format'
import type { PostWithAuthor } from '@/lib/types'
import { cn } from '@/lib/utils'

export function PostCard({
  post,
  liked,
  detail = false,
  surface = 'bare',
}: {
  post: PostWithAuthor
  liked: boolean
  detail?: boolean
  surface?: 'bare' | 'card'
}) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const deletePost = useDeletePost()
  const [confirmOpen, setConfirmOpen] = useState(false)

  const isAuthor = user?.id === post.author_id
  const shouldClamp =
    !detail && (post.content.length > 600 || post.content.split('\n').length > 10)
  const profilePath = `/u/${post.author.username}`
  const postPath = `/p/${post.id}`
  const fullDate = formatDateTime(post.created_at)

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${postPath}`)
      toast.success('تم نسخ الرابط')
    } catch {
      toast.error('تعذّر نسخ الرابط.')
    }
  }

  function handleDelete() {
    deletePost.mutate(post.id, {
      onSuccess: () => {
        setConfirmOpen(false)
        toast.success('تم حذف المنشور')
        if (location.pathname === postPath) navigate('/')
      },
      onError: (error) => toast.error(error.message),
    })
  }

  const content = (
    <div className="flex gap-3">
      <Link
        to={profilePath}
        aria-label={`عرض ملف ${post.author.display_name}`}
        className="shrink-0"
      >
        <UserAvatar profile={post.author} className="size-9" />
      </Link>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-1.5">
            <Link
              to={profilePath}
              dir="auto"
              className="truncate text-sm font-semibold text-foreground transition-colors hover:text-foreground/75"
            >
              {post.author.display_name}
            </Link>
            <Link
              to={profilePath}
              dir="ltr"
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              @{post.author.username}
            </Link>
            <span className="text-xs text-muted-foreground/50" aria-hidden="true">
              ·
            </span>
            <Link
              to={postPath}
              title={fullDate}
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              {timeAgo(post.created_at)}
            </Link>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="-me-1.5 shrink-0 text-muted-foreground"
                aria-label="خيارات المنشور"
              >
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onSelect={() => void copyLink()}>
                <Link2 />
                نسخ الرابط
              </DropdownMenuItem>
              {isAuthor ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={() => setConfirmOpen(true)}
                  >
                    <Trash2 />
                    حذف المنشور
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <p
          dir="auto"
          className={cn(
            'mt-1 whitespace-pre-wrap break-words text-foreground',
            detail ? 'text-base leading-8' : 'text-[15px] leading-7',
            shouldClamp && 'line-clamp-10',
          )}
        >
          {post.content}
        </p>

        {shouldClamp ? (
          <Link
            to={postPath}
            className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            اقرأ المنشور كاملًا
            <ChevronLeft className="size-3.5" />
          </Link>
        ) : null}

        {post.tags.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
            {post.tags.map((tag) => (
              <Link
                key={tag}
                to={`/tags/${tag}`}
                dir="ltr"
                className="text-xs text-muted-foreground transition-colors hover:text-foreground hover:underline"
              >
                #{tag}
              </Link>
            ))}
          </div>
        ) : null}

        <div className="mt-2 flex items-center gap-4">
          <LikeButton postId={post.id} likeCount={post.like_count} liked={liked} />
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 rounded-md px-1.5 text-xs font-normal text-muted-foreground hover:text-foreground"
          >
            <Link to={`${postPath}#comments`} aria-label="عرض التعليقات">
              <MessageSquare className="size-4" />
              <span className="tabular-nums">{post.comment_count}</span>
            </Link>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => void copyLink()}
            aria-label="نسخ رابط المنشور"
            title="نسخ الرابط"
            className="text-muted-foreground hover:text-foreground"
          >
            <Link2 />
          </Button>

          {detail ? (
            <span className="ms-auto text-xs text-muted-foreground">{fullDate}</span>
          ) : null}
        </div>
      </div>
    </div>
  )

  if (surface === 'card') {
    return (
      <Card className="p-4 sm:p-5">
        {content}
        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title="حذف المنشور"
          description="سيتم حذف المنشور وكل تعليقاته نهائيًا. ما تقدر تتراجع عن هذا الإجراء."
          confirmLabel="حذف"
          pending={deletePost.isPending}
          onConfirm={handleDelete}
        />
      </Card>
    )
  }

  return (
    <article className="px-4 py-4 transition-colors hover:bg-muted/30 sm:px-5">
      {content}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="حذف المنشور"
        description="سيتم حذف المنشور وكل تعليقاته نهائيًا. ما تقدر تتراجع عن هذا الإجراء."
        confirmLabel="حذف"
        pending={deletePost.isPending}
        onConfirm={handleDelete}
      />
    </article>
  )
}
