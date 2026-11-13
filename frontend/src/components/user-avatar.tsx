import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { initials } from '@/lib/format'
import type { Profile } from '@/lib/types'
import { cn } from '@/lib/utils'

export function UserAvatar({
  profile,
  name,
  className,
}: {
  profile?: Profile | null
  name?: string
  className?: string
}) {
  const label = profile?.display_name || profile?.username || name || 'مستخدم'

  return (
    <Avatar
      className={cn(
        'size-9 shrink-0 rounded-full border border-border bg-secondary',
        className,
      )}
    >
      {profile?.avatar_url ? (
        <AvatarImage src={profile.avatar_url} alt="" className="object-cover" />
      ) : null}
      <AvatarFallback className="rounded-full bg-secondary text-[11px] font-semibold text-muted-foreground">
        {initials(label)}
      </AvatarFallback>
    </Avatar>
  )
}
