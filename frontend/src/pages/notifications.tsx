import { ChevronLeftIcon, Loading03Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { EmptyState } from '@/components/empty-state'
import { UserAvatar } from '@/components/user-avatar'
import { VerifiedBadge } from '@/components/verified-badge'
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
import { isVerified } from '@/lib/verified'
import type { Notification } from '@/lib/types'

function notificationText(notification: Notification): string {
  switch (notification.type) {
    case 'like':
      return 'أعجب بمنشورك'
    case 'follow':
      return 'بدأ يتبعك'
    case 'reply':
      return 'رد على تعليقك'
    case 'mention':
      return notification.comment_id
        ? 'ذكرك في تعليق'
        : 'ذكرك في منشور'
    default:
      return 'علّق على منشورك'
  }
}

function notificationHref(notification: Notification): string {
  if (!notification.post_id) return `/u/${notification.actor.username}`

  const showComments =
    notification.type === 'comment' ||
    notification.type === 'reply' ||
    (notification.type === 'mention' && Boolean(notification.comment_id))

  return `/p/${notification.post_id}${showComments ? '#comments' : ''}`
}

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
            الإعجابات والتعليقات والردود والإشارات، وكل من يتبعك.
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
            {markAllRead.isPending ? (
              <HugeiconsIcon icon={Loading03Icon} className="animate-spin" />
            ) : null}
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
          description="لما أحد يعجب بمنشوراتك أو يعلّق عليها أو يذكرك، يظهر هنا."
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
              const text = notificationText(notification)

              return (
                <Link
                  key={notification.id}
                  to={notificationHref(notification)}
                  onClick={() => {
                    if (unreadItem) markRead.mutate(notification.id)
                  }}
                  className="flex gap-3 p-4 transition-colors hover:bg-secondary/40 sm:p-5"
                >
                  <UserAvatar profile={notification.actor} className="size-9" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-7">
                      <span dir="auto" className="inline-flex items-center gap-1 align-middle font-semibold">
                        {notification.actor.display_name}
                        {isVerified(notification.actor.username) ? (
                          <VerifiedBadge className="size-3.5" />
                        ) : null}
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
                    <HugeiconsIcon
                      icon={ChevronLeftIcon}
                      className="size-4 text-muted-foreground/60"
                    />
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
                  <HugeiconsIcon icon={Loading03Icon} className="animate-spin" />
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
