import { Heart } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/use-auth'
import { useToggleLike } from '@/hooks/use-mutations'
import { formatCount } from '@/lib/format'
import { cn } from '@/lib/utils'

export function LikeButton({
  postId,
  likeCount,
  liked,
}: {
  postId: string
  likeCount: number
  liked: boolean
}) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const mutation = useToggleLike(postId)

  function handleClick() {
    if (!user) {
      navigate('/login', { state: { from: location.pathname + location.search } })
      return
    }
    mutation.mutate(liked, {
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
      aria-pressed={liked}
      aria-label={liked ? 'إلغاء الإعجاب بالمنشور' : 'الإعجاب بالمنشور'}
      className={cn(
        'h-8 gap-1.5 rounded-full px-1.5 text-xs font-normal text-muted-foreground hover:text-foreground',
      )}
    >
      <Heart className={cn('size-4', liked && 'fill-current text-foreground')} />
      <span className="tabular-nums">{formatCount(likeCount)}</span>
    </Button>
  )
}
