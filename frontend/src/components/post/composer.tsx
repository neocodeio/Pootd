import { useEffect, useRef, useState } from 'react'
import { Loading03Icon, SentIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { UserAvatar } from '@/components/user-avatar'
import { useAuth } from '@/hooks/use-auth'
import { useCreatePost } from '@/hooks/use-mutations'
import { extractTags } from '@/lib/validation'

const MAX_LENGTH = 4000

function SignedOutPrompt() {
  return (
    <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-semibold text-foreground">انضم إلى النقاش</p>
        <p className="mt-1 text-sm text-muted-foreground">
          سجّل دخولك عشان تنشر وتتفاعل مع المجتمع.
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button asChild variant="outline" size="sm">
          <Link to="/login">تسجيل الدخول</Link>
        </Button>
        <Button asChild size="sm">
          <Link to="/signup">إنشاء حساب</Link>
        </Button>
      </div>
    </div>
  )
}

export function Composer({ autoFocus = false }: { autoFocus?: boolean }) {
  const { user, profile, loading } = useAuth()
  const createPost = useCreatePost()
  const [content, setContent] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (autoFocus && user && !loading) {
      textareaRef.current?.focus()
      textareaRef.current?.scrollIntoView({ block: 'center' })
    }
  }, [autoFocus, user, loading])

  if (loading) {
    return (
      <Card className="p-5">
        <div className="flex gap-3">
          <Skeleton className="size-10 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2.5">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="mt-3 h-8 w-24 rounded-full" />
          </div>
        </div>
      </Card>
    )
  }

  if (!user) {
    return (
      <Card>
        <SignedOutPrompt />
      </Card>
    )
  }

  const canSubmit = content.trim().length > 0 && !createPost.isPending

  function submit() {
    if (!canSubmit) return

    createPost.mutate(
      { content, tags: extractTags(content) },
      {
        onSuccess: () => {
          setContent('')
          toast.success('تم النشر')
        },
        onError: (error) => toast.error(error.message),
      },
    )
  }

  return (
    <Card className="overflow-hidden">
      <form
        id="compose"
        onSubmit={(event) => {
          event.preventDefault()
          submit()
        }}
        className="scroll-mt-24 p-4 sm:p-5"
      >
        <div className="flex gap-3">
          <UserAvatar profile={profile} className="mt-0.5 size-10" />
          <div className="min-w-0 flex-1">
            <Label htmlFor="composer-content" className="sr-only">
              محتوى المنشور
            </Label>
            <Textarea
              id="composer-content"
              ref={textareaRef}
              value={content}
              onChange={(event) => setContent(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                  event.preventDefault()
                  submit()
                }
              }}
              placeholder="شارك اكتشافًا، أداة، أو سؤالًا…"
              maxLength={MAX_LENGTH}
              rows={2}
              dir="auto"
              className="min-h-24 resize-none border-0 bg-transparent p-0 px-1 text-[15px] leading-7 shadow-none placeholder:text-muted-foreground/70 focus-visible:ring-0"
            />

            <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3">
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="tabular-nums">
                  {content.length}/{MAX_LENGTH}
                </span>
              </div>
              <Button type="submit" size="sm" className="rounded-full px-4" disabled={!canSubmit}>
                {createPost.isPending ? (
                  <HugeiconsIcon icon={Loading03Icon} className="animate-spin" />
                ) : (
                  <HugeiconsIcon icon={SentIcon} />
                )}
                نشر
              </Button>
            </div>
          </div>
        </div>
      </form>
    </Card>
  )
}
