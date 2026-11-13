import { useState } from 'react'
import { Loader2, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { UserAvatar } from '@/components/user-avatar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/hooks/use-auth'
import { useCreateComment, useDeleteComment } from '@/hooks/use-mutations'
import { useComments } from '@/hooks/use-pootd'
import { timeAgo } from '@/lib/format'
import type { CommentWithAuthor } from '@/lib/types'

const MAX_COMMENT_LENGTH = 1000

export function CommentSection({
  postId,
  postAuthorId,
}: {
  postId: string
  postAuthorId: string
}) {
  const { user, profile } = useAuth()
  const { data, isLoading, error } = useComments(postId)
  const createComment = useCreateComment(postId)
  const deleteComment = useDeleteComment(postId)
  const [content, setContent] = useState('')
  const [target, setTarget] = useState<CommentWithAuthor | null>(null)

  const canSubmit = content.trim().length > 0 && !createComment.isPending

  function submit() {
    if (!canSubmit) return
    createComment.mutate(content, {
      onSuccess: () => {
        setContent('')
        toast.success('تم إضافة التعليق')
      },
      onError: (mutationError) => toast.error(mutationError.message),
    })
  }

  function handleDelete() {
    if (!target) return
    deleteComment.mutate(target.id, {
      onSuccess: () => {
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
            ({data?.length ?? 0})
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
              <Label htmlFor="comment-input" className="sr-only">
                اكتب تعليقًا
              </Label>
              <Textarea
                id="comment-input"
                value={content}
                onChange={(event) => setContent(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                    event.preventDefault()
                    submit()
                  }
                }}
                placeholder="أضف تعليقًا…"
                rows={2}
                maxLength={MAX_COMMENT_LENGTH}
                dir="auto"
                className="min-h-0 resize-none border-0 bg-transparent p-0 text-sm leading-7 shadow-none focus-visible:ring-0"
              />
              <div className="mt-1 flex items-center justify-between gap-2">
                <span className="text-[11px] tabular-nums text-muted-foreground">
                  {content.length}/{MAX_COMMENT_LENGTH}
                </span>
                <Button type="submit" size="sm" disabled={!canSubmit}>
                  {createComment.isPending ? <Loader2 className="animate-spin" /> : null}
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
      ) : !data || data.length === 0 ? (
        <p className="border-t border-border px-4 py-8 text-center text-sm text-muted-foreground sm:px-5">
          ما فيه تعليقات بعد. ابدأ النقاش.
        </p>
      ) : (
        <div className="divide-y divide-border border-t border-border">
          {data.map((comment) => {
            const canDelete =
              user?.id === comment.author_id || user?.id === postAuthorId

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
                    {canDelete ? (
                      <button
                        type="button"
                        onClick={() => setTarget(comment)}
                        aria-label="حذف التعليق"
                        className="ms-auto text-muted-foreground/60 opacity-100 transition-colors hover:text-foreground sm:opacity-0 sm:group-hover:opacity-100"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    ) : null}
                  </div>
                  <p
                    dir="auto"
                    className="mt-1 whitespace-pre-wrap break-words text-sm leading-7 text-foreground/90"
                  >
                    {comment.content}
                  </p>
                </div>
              </article>
            )
          })}
        </div>
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
    </Card>
  )
}
