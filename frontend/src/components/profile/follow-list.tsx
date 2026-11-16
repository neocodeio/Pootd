import { Link } from 'react-router-dom'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { UserAvatar } from '@/components/user-avatar'
import { useFollows } from '@/hooks/use-pootd'

export function FollowList({
  open,
  onOpenChange,
  userId,
  kind,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string | undefined
  kind: 'followers' | 'following'
}) {
  const { data: users, isLoading } = useFollows(userId, kind)
  const isFollowers = kind === 'followers'
  const title = isFollowers ? 'المتابعون' : 'يتابع'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        aria-describedby={undefined}
        className="max-h-[70vh] overflow-y-auto rounded-2xl sm:max-w-md"
      >
        <DialogTitle className="font-heading text-lg">{title}</DialogTitle>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="flex items-center gap-3 px-2 py-2">
                <Skeleton className="size-9 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            ))}
          </div>
        ) : (users ?? []).length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {isFollowers ? 'لا يتبع أحد بعد.' : 'لا يتبع أحدًا بعد.'}
          </p>
        ) : (
          <div className="space-y-1">
            {(users ?? []).map((profile) => (
              <Link
                key={profile.id}
                to={`/u/${profile.username}`}
                onClick={() => onOpenChange(false)}
                className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-secondary/60"
              >
                <UserAvatar
                  profile={profile}
                  name={profile.display_name}
                  className="size-9 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p dir="auto" className="truncate text-sm font-semibold">
                    {profile.display_name}
                  </p>
                  <p dir="ltr" className="truncate text-xs text-muted-foreground">
                    @{profile.username}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
