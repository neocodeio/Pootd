import { useMemo, useState } from 'react'
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useInfiniteScroll } from '@/hooks/use-infinite-scroll'
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useMarkNotificationsRead,
} from '@/hooks/use-mutations'
import { useNotifications, useUnreadNotificationCount } from '@/hooks/use-pootd'
import { timeAgo } from '@/lib/format'
import {
  groupNotifications,
  likesSummary,
  matchesFilter,
  NOTIFICATION_FILTERS,
  notificationHref,
  notificationText,
} from '@/lib/notifications'
import type { NotificationFilter } from '@/lib/notifications'
import { flattenPages } from '@/lib/pagination'
import type { Notification, Profile } from '@/lib/types'
import { isVerified } from '@/lib/verified'

/** Overlapping avatars for a collapsed "N people liked" row. */
function ActorStack({ actors }: { actors: Profile[] }) {
  const shown = actors.slice(0, 3)
  const extra = actors.length - shown.length

  return (
    <div dir="ltr" className="flex shrink-0 items-center">
      {shown.map((actor, index) => (
        <UserAvatar
          key={`${actor.id}-${index}`}
          profile={actor}
          className={
            index === 0
              ? 'size-9 ring-2 ring-card'
              : '-ms-2 size-9 ring-2 ring-card'
          }
        />
      ))}
      {extra > 0 ? (
        <span className="-ms-2 flex size-9 items-center justify-center rounded-full bg-secondary text-[11px] font-medium text-muted-foreground ring-2 ring-card">
          +{extra}
        </span>
      ) : null}
    </div>
  )
}

function UnreadMeta({ unread }: { unread: boolean }) {
  return (
    <span className="flex shrink-0 items-center gap-2 self-center">
      {unread ? (
        <span aria-label="غير مقروء" className="size-2 rounded-full bg-foreground" />
      ) : null}
      <HugeiconsIcon
        icon={ChevronLeftIcon}
        className="size-4 text-muted-foreground/60"
      />
    </span>
  )
}

function SingleRow({
  notification,
  onOpen,
}: {
  notification: Notification
  onOpen: () => void
}) {
  const unread = !notification.read_at

  return (
    <Link
      to={notificationHref(notification)}
      onClick={onOpen}
      className="flex gap-3 p-4 transition-colors hover:bg-secondary/40 sm:p-5"
    >
      <UserAvatar profile={notification.actor} className="size-9" />
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-7">
          <span
            dir="auto"
            className="inline-flex items-center gap-1 align-middle font-semibold"
          >
            {notification.actor.display_name}
            {isVerified(notification.actor.username) ? (
              <VerifiedBadge className="size-3.5" />
            ) : null}
          </span>{' '}
          <span className="text-muted-foreground">
            {notificationText(notification)}
          </span>
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
      <UnreadMeta unread={unread} />
    </Link>
  )
}

function LikesRow({
  postId,
  actors,
  count,
  createdAt,
  unread,
  onOpen,
}: {
  postId: string
  actors: Profile[]
  count: number
  createdAt: string
  unread: boolean
  onOpen: () => void
}) {
  return (
    <Link
      to={`/p/${postId}`}
      onClick={onOpen}
      className="flex gap-3 p-4 transition-colors hover:bg-secondary/40 sm:p-5"
    >
      <ActorStack actors={actors} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-7">{likesSummary(count)}</p>
        <p
          className="text-xs text-muted-foreground"
          title={new Date(createdAt).toLocaleString('ar-SA-u-nu-latn')}
        >
          {timeAgo(createdAt)}
        </p>
      </div>
      <UnreadMeta unread={unread} />
    </Link>
  )
}

const EMPTY_COPY: Record<NotificationFilter, { title: string; description: string }> = {
  all: {
    title: 'ما فيه إشعارات بعد',
    description: 'لما أحد يعجب بمنشوراتك أو يعلّق عليها أو يذكرك، يظهر هنا.',
  },
  mentions: {
    title: 'ما فيه إشارات',
    description: 'لما أحد يذكرك بـ @ أو يرد على تعليقك، يظهر هنا.',
  },
  follows: {
    title: 'ما فيه متابعات جديدة',
    description: 'لما أحد يبدأ يتبعك، يظهر هنا.',
  },
  likes: {
    title: 'ما فيه إعجابات',
    description: 'لما أحد يعجب بمنشوراتك، يظهر هنا.',
  },
}

export function NotificationsPage() {
  const notifications = useNotifications()
  const unread = useUnreadNotificationCount()
  const markRead = useMarkNotificationRead()
  const markManyRead = useMarkNotificationsRead()
  const markAllRead = useMarkAllNotificationsRead()
  const [filter, setFilter] = useState<NotificationFilter>('all')

  const items = useMemo(
    () => flattenPages(notifications.data) ?? [],
    [notifications.data],
  )
  const entries = useMemo(
    () => groupNotifications(items.filter((item) => matchesFilter(item, filter))),
    [items, filter],
  )
  const unreadCount = unread.data ?? 0

  const { sentinelRef, autoLoad } = useInfiniteScroll({
    hasMore: Boolean(notifications.hasNextPage),
    isLoading: notifications.isFetchingNextPage,
    hasError: notifications.isFetchNextPageError,
    onLoadMore: () => void notifications.fetchNextPage(),
  })

  function handleMarkAll() {
    markAllRead.mutate(undefined, {
      onSuccess: () => toast.success('تم تعليم كل الإشعارات كمقروءة'),
      onError: (error) => toast.error(error.message),
    })
  }

  function openSingle(notification: Notification) {
    if (!notification.read_at) markRead.mutate(notification.id)
  }

  function openGroup(group: Notification[]) {
    const pending = group.filter((item) => !item.read_at).map((item) => item.id)
    if (pending.length > 0) markManyRead.mutate(pending)
  }

  return (
    <div className="space-y-4">
      <header>
        <div className="flex items-end justify-between gap-3">
          <div>
            <h1 className="font-heading text-xl font-semibold tracking-tight">
              الإشعارات
            </h1>
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
              className="shrink-0 rounded-full px-3 text-xs text-muted-foreground hover:text-foreground"
            >
              {markAllRead.isPending ? (
                <HugeiconsIcon icon={Loading03Icon} className="animate-spin" />
              ) : null}
              تعليم الكل كمقروء
            </Button>
          ) : null}
        </div>

        <Tabs
          value={filter}
          onValueChange={(value) => setFilter(value as NotificationFilter)}
          className="mt-4"
        >
          <TabsList className="grid h-9 w-full grid-cols-4">
            {NOTIFICATION_FILTERS.map((option) => (
              <TabsTrigger
                key={option.value}
                value={option.value}
                className="px-1 text-xs sm:text-sm"
              >
                {option.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
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
      ) : entries.length === 0 ? (
        <EmptyState
          title={EMPTY_COPY[filter].title}
          description={EMPTY_COPY[filter].description}
          action={
            filter === 'all' ? (
              <Button asChild variant="outline" size="sm">
                <Link to="/">تصفح الرئيسية</Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-3">
          <Card className="divide-y divide-border overflow-hidden">
            {entries.map((entry) =>
              entry.kind === 'likes' ? (
                <LikesRow
                  key={entry.id}
                  postId={entry.postId}
                  actors={entry.actors}
                  count={entry.actors.length}
                  createdAt={entry.createdAt}
                  unread={entry.unread}
                  onOpen={() => openGroup(entry.notifications)}
                />
              ) : (
                <SingleRow
                  key={entry.id}
                  notification={entry.notification}
                  onOpen={() => openSingle(entry.notification)}
                />
              ),
            )}
          </Card>

          {notifications.hasNextPage ? (
            <div className="pt-1">
              <div ref={sentinelRef} aria-hidden="true" className="h-px w-full" />
              {notifications.isFetchingNextPage ? (
                <p
                  role="status"
                  className="flex items-center justify-center gap-2 py-3 text-xs text-muted-foreground"
                >
                  <HugeiconsIcon
                    icon={Loading03Icon}
                    className="size-3.5 animate-spin"
                    aria-hidden="true"
                  />
                  جارٍ تحميل المزيد…
                </p>
              ) : !autoLoad || notifications.isFetchNextPageError ? (
                <div className="flex justify-center">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => void notifications.fetchNextPage()}
                    className="rounded-full px-4 text-xs text-muted-foreground hover:text-foreground"
                  >
                    حمّل المزيد
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
