import { Bookmark01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/use-auth'
import { useToggleBookmark } from '@/hooks/use-mutations'
import { cn } from '@/lib/utils'

export function BookmarkButton({
  postId,
  bookmarked,
}: {
  postId: string
  bookmarked: boolean
}) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const mutation = useToggleBookmark(postId)

  function handleClick() {
    if (!user) {
      navigate('/login', { state: { from: location.pathname + location.search } })
      return
    }
    mutation.mutate(bookmarked, {
      onError: (error) => toast.error(error.message),
    })
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={handleClick}
      disabled={mutation.isPending}
      aria-pressed={bookmarked}
      aria-label={bookmarked ? 'إزالة المنشور من المحفوظات' : 'حفظ المنشور'}
      title={bookmarked ? 'إزالة من المحفوظات' : 'حفظ المنشور'}
      className={cn(
        'gap-1.5 rounded-full px-2.5 text-xs text-muted-foreground hover:text-foreground',
        bookmarked && 'text-foreground',
      )}
    >
      <HugeiconsIcon
        icon={Bookmark01Icon}
        className={cn('size-4', bookmarked && 'fill-current')}
      />
    </Button>
  )
}
