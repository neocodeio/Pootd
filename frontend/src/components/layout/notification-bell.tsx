import { Notification01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/use-auth'
import { useUnreadNotificationCount } from '@/hooks/use-pootd'
import { cn } from '@/lib/utils'

export function NotificationBell({ className }: { className?: string }) {
  const { user } = useAuth()
  const unread = useUnreadNotificationCount()

  if (!user) return null

  const count = unread.data ?? 0
  const label =
    count > 0 ? `الإشعارات، ${count} غير مقروءة` : 'الإشعارات'

  return (
    <Button
      asChild
      variant="ghost"
      size="icon-sm"
      className={cn('relative text-muted-foreground hover:text-foreground', className)}
    >
      <Link to="/notifications" aria-label={label} title={label}>
        <HugeiconsIcon icon={Notification01Icon} className="size-4" />
        {count > 0 ? (
          <span
            aria-hidden="true"
            className="absolute -top-0.5 -end-0.5 flex min-w-4 items-center justify-center rounded-full bg-foreground px-1 text-[10px] font-semibold leading-4 text-background tabular-nums"
          >
            {count > 9 ? '9+' : count}
          </span>
        ) : null}
      </Link>
    </Button>
  )
}
