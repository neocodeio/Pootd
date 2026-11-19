import { useState } from 'react'
import {
  Cancel01Icon,
  ChevronLeftIcon,
  Comment01Icon,
  Delete02Icon,
  Flag01Icon,
  Loading03Icon,
  MoreHorizontalIcon,
  PencilEdit01Icon,
  SaveIcon,
  Share08Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { ImagePreview } from '@/components/image-preview'
import { BookmarkButton } from '@/components/post/bookmark-button'
import { LikeButton } from '@/components/post/like-button'
import { PostContent } from '@/components/post/post-content'
import { ShareDialog } from '@/components/post/share-dialog'
import { ReportDialog } from '@/components/report-dialog'
import { UserAvatar } from '@/components/user-avatar'
import { VerifiedBadge } from '@/components/verified-badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/hooks/use-auth'
import { useDeletePost, useUpdatePost } from '@/hooks/use-mutations'
import { timeAgo } from '@/lib/format'
import { extractTags } from '@/lib/validation'
import { isVerified } from '@/lib/verified'
import type { PostWithAuthor } from '@/lib/types'
import { cn } from '@/lib/utils'

const MAX_LENGTH = 4000

export function PostCard({
  post,
  liked,
  bookmarked = false,
  detail = false,
}: {
  post: PostWithAuthor
  liked: boolean
  bookmarked?: boolean
  detail?: boolean
}) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const deletePost = useDeletePost()
  const updatePost = useUpdatePost()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [imageOpen, setImageOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draftContent, setDraftContent] = useState(post.content)

  const isAuthor = user?.id === post.author_id
  const shouldClamp =
    !detail && (post.content.length > 600 || post.content.split('\n').length > 10)
  const wasEdited = post.updated_at !== post.created_at

  function handleDelete() {
    deletePost.mutate(
      { postId: post.id, imageUrl: post.image_url ?? undefined },
      {
        onSuccess: () => {
          setConfirmOpen(false)
          toast.success('تم حذف المنشور')
          if (location.pathname === `/p/${post.id}`) navigate('/')
        },
        onError: (error) => toast.error(error.message),
      },
    )
  }

  function startEditing() {
    setDraftContent(post.content)
    setEditing(true)
  }

  function cancelEditing() {
    setDraftContent(post.content)
    setEditing(false)
  }

  function saveEditing() {
    const content = draftContent.trim()
    if (!content) {
      toast.error('المنشور ما يقدر يكون فاضي.')
      return
    }
    if (content.length > MAX_LENGTH) {
      toast.error(`المنشور لازم يكون ${MAX_LENGTH} حرف أو أقل.`)
      return
    }

    updatePost.mutate(
      { postId: post.id, content, tags: extractTags(content) },
      {
        onSuccess: () => {
          setEditing(false)
          toast.success('تم تعديل المنشور')
        },
        onError: (error) => toast.error(error.message),
      },
    )
  }

  if (editing) {
    return (
      <Card className="p-4 sm:p-5">
        <div className="flex gap-3">
          <UserAvatar profile={post.author} className="mt-0.5 size-10" />
          <div className="min-w-0 flex-1">
            <Label htmlFor={`edit-post-${post.id}`} className="sr-only">
              تعديل المنشور
            </Label>
            <Textarea
              id={`edit-post-${post.id}`}
              value={draftContent}
              onChange={(event) => setDraftContent(event.target.value)}
              maxLength={MAX_LENGTH}
              rows={6}
              dir="auto"
              autoFocus
              className="min-h-32 resize-y border-0 bg-transparent p-0 px-1 text-[15px] leading-8 shadow-none focus-visible:ring-0"
            />

            <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3">
              <span className="text-xs tabular-nums text-muted-foreground">
                {draftContent.length}/{MAX_LENGTH}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={cancelEditing}
                  disabled={updatePost.isPending}
                >
                  <HugeiconsIcon icon={Cancel01Icon} />
                  إلغاء
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={saveEditing}
                  disabled={updatePost.isPending || !draftContent.trim()}
                >
                  {updatePost.isPending ? (
                    <HugeiconsIcon icon={Loading03Icon} className="animate-spin" />
                  ) : (
                    <HugeiconsIcon icon={SaveIcon} />
                  )}
                  حفظ
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card
      className={cn(
        'p-4 transition-colors sm:p-5',
        !detail && 'hover:border-foreground/15',
      )}
    >
      <div className="flex gap-3">
        <Link
          to={`/u/${post.author.username}`}
          aria-label={`عرض ملف ${post.author.display_name}`}
          className="shrink-0"
        >
          <UserAvatar profile={post.author} className="size-10" />
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <Link
                to={`/u/${post.author.username}`}
                dir="auto"
                className="truncate text-[15px] font-semibold hover:underline"
              >
                {post.author.display_name}
              </Link>
              {isVerified(post.author.username) ? (
                <VerifiedBadge className="-ms-1 self-center" />
              ) : null}
              <Link
                to={`/u/${post.author.username}`}
                dir="ltr"
                className="text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                @{post.author.username}
              </Link>
              <span className="text-xs text-muted-foreground/60" aria-hidden="true">
                ·
              </span>
              <Link
                to={`/p/${post.id}`}
                title={new Date(post.created_at).toLocaleString('ar-SA-u-nu-latn')}
                className="text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                {timeAgo(post.created_at)}
              </Link>
              {wasEdited ? (
                <span className="text-xs text-muted-foreground/60">· معدّل</span>
              ) : null}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="-me-1 shrink-0 rounded-full text-muted-foreground"
                  aria-label="خيارات المنشور"
                >
                  <HugeiconsIcon icon={MoreHorizontalIcon} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onSelect={() => setShareOpen(true)}>
                  <HugeiconsIcon icon={Share08Icon} />
                  مشاركة المنشور
                </DropdownMenuItem>
                {isAuthor ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={startEditing}>
                      <HugeiconsIcon icon={PencilEdit01Icon} />
                      تعديل المنشور
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onSelect={() => setConfirmOpen(true)}
                    >
                      <HugeiconsIcon icon={Delete02Icon} />
                      حذف المنشور
                    </DropdownMenuItem>
                  </>
                ) : user ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => setReportOpen(true)}>
                      <HugeiconsIcon icon={Flag01Icon} />
                      الإبلاغ عن المنشور
                    </DropdownMenuItem>
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <PostContent
            content={post.content}
            className={cn(
              'mt-2',
              detail ? 'text-[16px] leading-8' : 'text-[15px] leading-8',
              shouldClamp && 'line-clamp-10',
            )}
          />

          {shouldClamp ? (
            <Link
              to={`/p/${post.id}`}
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              اقرأ المنشور كاملًا
              <HugeiconsIcon icon={ChevronLeftIcon} className="size-3.5" />
            </Link>
          ) : null}

          {post.image_url ? (
            <button
              type="button"
              onClick={() => setImageOpen(true)}
              className="mt-3 block w-full cursor-zoom-in overflow-hidden rounded-xl border border-border bg-secondary/40"
              aria-label="عرض الصورة بحجم كامل"
            >
              <img
                src={post.image_url}
                alt={`صورة مرفقة بمنشور ${post.author.display_name}`}
                loading="lazy"
                decoding="async"
                className="max-h-[32rem] w-full object-contain"
              />
            </button>
          ) : null}

          <div className="mt-3 flex items-center gap-0.5">
            <LikeButton postId={post.id} likeCount={post.like_count} liked={liked} />
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="gap-1.5 rounded-full px-2.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <Link to={`/p/${post.id}#comments`} aria-label="عرض التعليقات">
                <HugeiconsIcon icon={Comment01Icon} className="size-4" />
                <span className="tabular-nums">{post.comment_count}</span>
              </Link>
            </Button>
            <BookmarkButton postId={post.id} bookmarked={bookmarked} />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setShareOpen(true)}
              aria-label="مشاركة المنشور"
              className="rounded-full text-muted-foreground hover:text-foreground"
            >
              <HugeiconsIcon icon={Share08Icon} className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      <ImagePreview
        open={imageOpen}
        onOpenChange={setImageOpen}
        src={post.image_url ?? ''}
        alt={`صورة مرفقة بمنشور ${post.author.display_name}`}
      />

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="حذف المنشور"
        description="سيتم حذف المنشور وكل تعليقاته نهائيًا. ما تقدر تتراجع عن هذا الإجراء."
        confirmLabel="حذف"
        pending={deletePost.isPending}
        onConfirm={handleDelete}
      />

      <ReportDialog open={reportOpen} onOpenChange={setReportOpen} postId={post.id} />

      <ShareDialog open={shareOpen} onOpenChange={setShareOpen} post={post} />
    </Card>
  )
}
