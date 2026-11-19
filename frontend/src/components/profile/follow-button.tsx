import { UserAdd01Icon, UserCheck01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/use-auth'
import { useFollowState } from '@/hooks/use-pootd'
import { useToggleFollow } from '@/hooks/use-mutations'

export function FollowButton({
  targetUserId,
  onFollowed,
}: {
  targetUserId: string
  onFollowed?: (following: boolean) => void
}) {
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
      onClick={() =>
        toggleFollow(targetUserId, {
          onSuccess: (nowFollowing) => onFollowed?.(nowFollowing),
        })
      }
    >
      {isFollowing ? (
        <HugeiconsIcon icon={UserCheck01Icon} />
      ) : (
        <HugeiconsIcon icon={UserAdd01Icon} />
      )}
      {isFollowing ? 'إيقاف المتابعة' : 'متابعة'}
    </Button>
  )
}
