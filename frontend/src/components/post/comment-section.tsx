import { useRef, useState } from 'react'
import {
  Cancel01Icon,
  Delete02Icon,
  Flag01Icon,
  Loading03Icon,
  ReplyIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { PostContent } from '@/components/post/post-content'
import { MentionSuggestions } from '@/components/post/mention-suggestions'
import { ReportDialog } from '@/components/report-dialog'
import { UserAvatar } from '@/components/user-avatar'
import { VerifiedBadge } from '@/components/verified-badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/hooks/use-auth'
import { useMentionAutocomplete } from '@/hooks/use-mention-autocomplete'
import { useCreateComment, useDeleteComment } from '@/hooks/use-mutations'
import { useComments } from '@/hooks/use-pootd'
import { useRealtimeComments } from '@/hooks/use-realtime'
import { timeAgo } from '@/lib/format'
import { flattenPages } from '@/lib/pagination'
import { isVerified } from '@/lib/verified'
import type { CommentWithAuthor } from '@/lib/types'

const MAX_COMMENT_LENGTH = 1000

export function CommentSection({
  postId,
  postAuthorId,
  commentCount,
}: {
  postId: string
  postAuthorId: string
  commentCount?: number
}) {
  const { user, profile } = useAuth()
  const { data, isLoading, error, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useComments(postId)
  useRealtimeComments(postId)
  const createComment = useCreateComment(postId)
  const deleteComment = useDeleteComment(postId)
  const [content, setContent] = useState('')
  const [target, setTarget] = useState<CommentWithAuthor | null>(null)
  const [reportTarget, setReportTarget] = useState<CommentWithAuthor | null>(null)
  const [replyTo, setReplyTo] = useState<CommentWithAuthor | null>(null)
  const commentInputRef = useRef<HTMLTextAreaElement>(null)
  const mention = useMentionAutocomplete({
    value: content,
    onChange: setContent,
    textareaRef: commentInputRef,
  })

  const comments = flattenPages(data)
  const canSubmit = content.trim().length > 0 && !createComment.isPending

  function startReply(comment: CommentWithAuthor) {
    setReplyTo(comment)
    window.requestAnimationFrame(() => {
      commentInputRef.current?.focus()
      commentInputRef.current?.scrollIntoView({ block: 'center' })
    })
  }

  function submit() {
    if (!canSubmit) return
    createComment.mutate(
      { content, parentId: replyTo?.id },
      {
        onSuccess: () => {
          setContent('')
          setReplyTo(null)
          toast.success(replyTo ? 'تم إضافة الرد' : 'تم إضافة التعليق')
        },
        onError: (mutationError) => toast.error(mutationError.message),
      },
    )
  }

  function handleDelete() {
    if (!target) return
    deleteComment.mutate(target.id, {
      onSuccess: () => {
        if (replyTo?.id === target.id) setReplyTo(null)
        setTarget(null)
        toast.success('تم حذف التعليق')
      },
      onError: (mutationError) => toast.error(mutationError.message),
    })
  }

  return (
    <Card id="comments" className="mt-4 scroll-mt-24 overflow-hidden">
      <div className="p-4 sm:p-5">
        <h2 className="text-sm font-semibold">
          التعليقات{' '}
          <span className="text-xs font-normal text-muted-foreground">
            ({commentCount ?? comments?.length ?? 0})
          </span>
        </h2>

        {user ? (
          <form
            onSubmit={(event) => {
              event.preventDefault()
              submit()
            }}
            className="mt-4 flex gap-3"
          >
            <UserAvatar profile={profile} className="hidden size-8 sm:flex" />
            <div className="flex-1 rounded-lg border border-border bg-background p-2.5 transition-colors focus-within:border-foreground/25">
              {replyTo ? (
                <div className="mb-2 flex items-center justify-between gap-2 rounded-lg bg-secondary/60 px-2.5 py-1.5 text-[11px] text-muted-foreground">
                  <span>
                    ردًا على{' '}
                    <span dir="ltr" className="font-medium text-foreground">
                      @{replyTo.author.username}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setReplyTo(null)}
                    aria-label="إلغاء الرد"
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <HugeiconsIcon icon={Cancel01Icon} className="size-3.5" />
                  </button>
                </div>
              ) : null}
              <Label htmlFor="comment-input" className="sr-only">
                {replyTo ? 'اكتب ردًا' : 'اكتب تعليقًا'}
              </Label>
              <Textarea
                id="comment-input"
                ref={commentInputRef}
                value={content}
                onChange={(event) => {
                  setContent(event.target.value)
                  mention.syncCaret()
                }}
                onSelect={mention.syncCaret}
                onClick={mention.syncCaret}
                onKeyUp={mention.syncCaret}
                onBlur={mention.dismiss}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                    event.preventDefault()
                    submit()
                    return
                  }
                  mention.handleKeyDown(event)
                }}
                {...mention.controlProps}
                placeholder={replyTo ? `اكتب ردًا على @${replyTo.author.username}…` : 'أضف تعليقًا…'}
                rows={2}
                maxLength={MAX_COMMENT_LENGTH}
                dir="auto"
                className="min-h-0 resize-none border-0 bg-transparent p-0 text-sm leading-7 shadow-none focus-visible:ring-0"
              />
              <MentionSuggestions
                open={mention.open}
                options={mention.options}
                activeIndex={mention.activeIndex}
                listboxId={mention.listboxId}
                onHover={mention.setActiveIndex}
                onSelect={mention.select}
              />
              <div className="mt-1 flex items-center justify-between gap-2">
                <span className="text-[11px] tabular-nums text-muted-foreground">
                  {content.length}/{MAX_COMMENT_LENGTH}
                </span>
                <Button type="submit" size="sm" disabled={!canSubmit}>
                  {createComment.isPending ? (
                    <HugeiconsIcon icon={Loading03Icon} className="animate-spin" />
                  ) : null}
                  تعليق
                </Button>
              </div>
            </div>
          </form>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">
            <Link
              to="/login"
              className="font-medium text-foreground underline underline-offset-4 hover:text-foreground/80"
            >
              سجّل دخولك
            </Link>{' '}
            عشان تشارك في النقاش.
          </p>
        )}
      </div>

      {isLoading ? (
        <div className="divide-y divide-border border-t border-border">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="flex gap-3 px-4 py-4 sm:px-5">
              <Skeleton className="size-8 shrink-0 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-36" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <p className="border-t border-border px-4 py-6 text-sm text-muted-foreground sm:px-5">
          تعذّر تحميل التعليقات: {error.message}
        </p>
      ) : !comments || comments.length === 0 ? (
        <p className="border-t border-border px-4 py-8 text-center text-sm text-muted-foreground sm:px-5">
          ما فيه تعليقات بعد. ابدأ النقاش.
        </p>
      ) : (
        <>
          <div className="divide-y divide-border border-t border-border">
            {comments.map((comment) => {
              const canDelete =
                user?.id === comment.author_id || user?.id === postAuthorId
              const canReport = Boolean(user && user.id !== comment.author_id)

              return (
                <article key={comment.id} className="group flex gap-3 px-4 py-4 sm:px-5">
                  <Link
                    to={`/u/${comment.author.username}`}
                    aria-label={`عرض ملف ${comment.author.display_name}`}
                    className="shrink-0"
                  >
                    <UserAvatar profile={comment.author} className="size-8" />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <Link
                        to={`/u/${comment.author.username}`}
                        dir="auto"
                        className="text-sm font-medium hover:underline"
                      >
                        {comment.author.display_name}
                      </Link>
                      {isVerified(comment.author.username) ? (
                        <VerifiedBadge className="-ms-1 size-3.5 self-center" />
                      ) : null}
                      <span dir="ltr" className="text-xs text-muted-foreground">
                        @{comment.author.username}
                      </span>
                      <span className="text-xs text-muted-foreground/60" aria-hidden="true">
                        ·
                      </span>
                      <span
                        className="text-xs text-muted-foreground"
                        title={new Date(comment.created_at).toLocaleString('ar-SA-u-nu-latn')}
                      >
                        {timeAgo(comment.created_at)}
                      </span>
                      <span className="ms-auto flex items-center gap-1">
                        {user ? (
                          <button
                            type="button"
                            onClick={() => startReply(comment)}
                            aria-label={`رد على ${comment.author.display_name}`}
                            className="text-muted-foreground/60 opacity-100 transition-colors hover:text-foreground sm:opacity-0 sm:group-hover:opacity-100"
                          >
                            <HugeiconsIcon icon={ReplyIcon} className="size-3.5" />
                          </button>
                        ) : null}
                        {canReport ? (
                          <button
                            type="button"
                            onClick={() => setReportTarget(comment)}
                            aria-label="الإبلاغ عن التعليق"
                            className="text-muted-foreground/60 opacity-100 transition-colors hover:text-foreground sm:opacity-0 sm:group-hover:opacity-100"
                          >
                            <HugeiconsIcon icon={Flag01Icon} className="size-3.5" />
                          </button>
                        ) : null}
                        {canDelete ? (
                          <button
                            type="button"
                            onClick={() => setTarget(comment)}
                            aria-label="حذف التعليق"
                            className="text-muted-foreground/60 opacity-100 transition-colors hover:text-foreground sm:opacity-0 sm:group-hover:opacity-100"
                          >
                            <HugeiconsIcon icon={Delete02Icon} className="size-3.5" />
                          </button>
                        ) : null}
                      </span>
                    </div>
                    <PostContent
                      content={comment.content}
                      className="mt-1 text-sm leading-7 text-foreground/90"
                    />
                  </div>
                </article>
              )
            })}
          </div>

          {hasNextPage ? (
            <div className="border-t border-border p-3 text-center">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => void fetchNextPage()}
                disabled={isFetchingNextPage}
                className="rounded-full px-4 text-xs text-muted-foreground hover:text-foreground"
              >
                {isFetchingNextPage ? (
                  <HugeiconsIcon icon={Loading03Icon} className="animate-spin" />
                ) : null}
                حمّل المزيد من التعليقات
              </Button>
            </div>
          ) : null}
        </>
      )}

      <ConfirmDialog
        open={Boolean(target)}
        onOpenChange={(open) => {
          if (!open) setTarget(null)
        }}
        title="حذف التعليق"
        description="سيتم حذف التعليق نهائيًا."
        confirmLabel="حذف"
        pending={deleteComment.isPending}
        onConfirm={handleDelete}
      />

      <ReportDialog
        open={Boolean(reportTarget)}
        onOpenChange={(open) => {
          if (!open) setReportTarget(null)
        }}
        commentId={reportTarget?.id}
      />
    </Card>
  )
}
