import { ChevronLeft, Loader2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { EmptyState } from '@/components/empty-state'
import { UserAvatar } from '@/components/user-avatar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
} from '@/hooks/use-mutations'
import { useNotifications, useUnreadNotificationCount } from '@/hooks/use-pootd'
import { timeAgo } from '@/lib/format'
import { flattenPages } from '@/lib/pagination'

export function NotificationsPage() {
  const notifications = useNotifications()
  const unread = useUnreadNotificationCount()
  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()

  const items = flattenPages(notifications.data) ?? []
  const unreadCount = unread.data ?? 0

  function handleMarkAll() {
    markAllRead.mutate(undefined, {
      onSuccess: () => toast.success('تم تعليم كل الإشعارات كمقروءة'),
      onError: (error) => toast.error(error.message),
    })
  }

  return (
    <div className="space-y-4">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight">الإشعارات</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            الإعجابات والتعليقات على منشوراتك.
          </p>
        </div>
        {unreadCount > 0 ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleMarkAll}
            disabled={markAllRead.isPending}
            className="rounded-full px-3 text-xs text-muted-foreground hover:text-foreground"
          >
            {markAllRead.isPending ? <Loader2 className="animate-spin" /> : null}
            تعليم الكل كمقروء
          </Button>
        ) : null}
      </header>

      {notifications.isLoading ? (
        <Card className="divide-y divide-border">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="flex gap-3 p-4 sm:p-5">
              <Skeleton className="size-9 shrink-0 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-44" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </Card>
      ) : notifications.error ? (
        <EmptyState
          title="تعذّر تحميل الإشعارات"
          description={notifications.error.message}
          action={
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void notifications.refetch()}
            >
              حاول مرة ثانية
            </Button>
          }
        />
      ) : items.length === 0 ? (
        <EmptyState
          title="ما فيه إشعارات بعد"
          description="لما أحد يعجب بمنشوراتك أو يعلّق عليها، يظهر هنا."
          action={
            <Button asChild variant="outline" size="sm">
              <Link to="/">تصفح الرئيسية</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          <Card className="divide-y divide-border overflow-hidden">
            {items.map((notification) => {
              const unreadItem = !notification.read_at
              const text =
                notification.type === 'like'
                  ? 'أعجب بمنشورك'
                  : 'علّق على منشورك'

              return (
                <Link
                  key={notification.id}
                  to={notification.post_id ? `/p/${notification.post_id}` : '/'}
                  onClick={() => {
                    if (unreadItem) markRead.mutate(notification.id)
                  }}
                  className="flex gap-3 p-4 transition-colors hover:bg-secondary/40 sm:p-5"
                >
                  <UserAvatar profile={notification.actor} className="size-9" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-7">
                      <span dir="auto" className="font-semibold">
                        {notification.actor.display_name}
                      </span>{' '}
                      <span className="text-muted-foreground">{text}</span>
                    </p>
                    <p
                      className="text-xs text-muted-foreground"
                      title={new Date(notification.created_at).toLocaleString(
                        'ar-SA-u-nu-latn',
                      )}
                    >
                      {timeAgo(notification.created_at)}
                    </p>
                  </div>
                  <span className="flex shrink-0 items-center gap-2 self-center">
                    {unreadItem ? (
                      <span
                        aria-label="غير مقروء"
                        className="size-2 rounded-full bg-foreground"
                      />
                    ) : null}
                    <ChevronLeft className="size-4 text-muted-foreground/60" />
                  </span>
                </Link>
              )
            })}
          </Card>

          {notifications.hasNextPage ? (
            <div className="flex justify-center">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => void notifications.fetchNextPage()}
                disabled={notifications.isFetchingNextPage}
                className="rounded-full px-4 text-xs text-muted-foreground hover:text-foreground"
              >
                {notifications.isFetchingNextPage ? (
                  <Loader2 className="animate-spin" />
                ) : null}
                حمّل المزيد
              </Button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
