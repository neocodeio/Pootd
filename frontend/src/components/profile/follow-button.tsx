import { UserCheck, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/use-auth'
import { useFollowState } from '@/hooks/use-pootd'
import { useToggleFollow } from '@/hooks/use-mutations'

export function FollowButton({ targetUserId }: { targetUserId: string }) {
  const { user } = useAuth()
  const { data: following = false, isLoading } = useFollowState(user?.id, targetUserId)
  const { mutate: toggleFollow, isPending } = useToggleFollow()

  if (!user) return null

  const isFollowing = following

  return (
    <Button
      type="button"
      variant={isFollowing ? 'outline' : 'default'}
      size="sm"
      disabled={isPending || isLoading}
      onClick={() => void toggleFollow(targetUserId)}
    >
      {isFollowing ? <UserCheck /> : <UserPlus />}
      {isFollowing ? 'إيقاف المتابعة' : 'متابعة'}
    </Button>
  )
}
