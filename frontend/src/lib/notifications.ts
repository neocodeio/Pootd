import type { Notification, Profile } from './types'

export type NotificationFilter = 'all' | 'mentions' | 'follows' | 'likes'

export const NOTIFICATION_FILTERS: { value: NotificationFilter; label: string }[] = [
  { value: 'all', label: 'الكل' },
  { value: 'mentions', label: 'الإشارات' },
  { value: 'follows', label: 'المتابعات' },
  { value: 'likes', label: 'الإعجابات' },
]

/** `comment` notifications only live under الكل — there is no tab for them. */
export function matchesFilter(
  notification: Notification,
  filter: NotificationFilter,
): boolean {
  switch (filter) {
    case 'mentions':
      return notification.type === 'mention' || notification.type === 'reply'
    case 'follows':
      return notification.type === 'follow'
    case 'likes':
      return notification.type === 'like'
    default:
      return true
  }
}

export interface LikesEntry {
  kind: 'likes'
  id: string
  postId: string
  actors: Profile[]
  notifications: Notification[]
  createdAt: string
  unread: boolean
}

export interface SingleEntry {
  kind: 'single'
  id: string
  notification: Notification
}

export type NotificationEntry = LikesEntry | SingleEntry

/**
 * Collapses every like on the same post into one "N أشخاص أعجبوا بمنشورك" row
 * that keeps the newest like's position, so a popular post does not fill the
 * page with duplicates. Non-like notifications stay one row each.
 */
export function groupNotifications(items: Notification[]): NotificationEntry[] {
  const likesByPost = new Map<string, Notification[]>()

  for (const item of items) {
    if (item.type !== 'like' || !item.post_id) continue
    const bucket = likesByPost.get(item.post_id)
    if (bucket) bucket.push(item)
    else likesByPost.set(item.post_id, [item])
  }

  const entries: NotificationEntry[] = []
  const emitted = new Set<string>()

  for (const item of items) {
    if (item.type === 'like' && item.post_id) {
      if (emitted.has(item.post_id)) continue
      emitted.add(item.post_id)

      const bucket = likesByPost.get(item.post_id) ?? [item]

      if (bucket.length === 1) {
        entries.push({ kind: 'single', id: item.id, notification: item })
        continue
      }

      entries.push({
        kind: 'likes',
        id: `likes-${item.post_id}`,
        postId: item.post_id,
        actors: bucket.map((like) => like.actor),
        notifications: bucket,
        createdAt: bucket[0].created_at,
        unread: bucket.some((like) => !like.read_at),
      })
      continue
    }

    entries.push({ kind: 'single', id: item.id, notification: item })
  }

  return entries
}

/** Arabic plural forms for a collapsed like row. */
export function likesSummary(count: number): string {
  if (count <= 1) return 'أعجب بمنشورك'
  if (count === 2) return 'شخصان أعجبا بمنشورك'
  if (count <= 10) return `${count} أشخاص أعجبوا بمنشورك`
  return `${count} شخصًا أعجبوا بمنشورك`
}

export function notificationText(notification: Notification): string {
  switch (notification.type) {
    case 'like':
      return 'أعجب بمنشورك'
    case 'follow':
      return 'بدأ يتبعك'
    case 'reply':
      return 'رد على تعليقك'
    case 'mention':
      return notification.comment_id ? 'ذكرك في تعليق' : 'ذكرك في منشور'
    default:
      return 'علّق على منشورك'
  }
}

export function notificationHref(notification: Notification): string {
  if (!notification.post_id) return `/u/${notification.actor.username}`

  const showComments =
    notification.type === 'comment' ||
    notification.type === 'reply' ||
    (notification.type === 'mention' && Boolean(notification.comment_id))

  return `/p/${notification.post_id}${showComments ? '#comments' : ''}`
}
