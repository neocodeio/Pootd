import { describe, expect, it } from 'vitest'
import {
  groupNotifications,
  likesSummary,
  matchesFilter,
  notificationHref,
} from './notifications'
import type { Notification, NotificationType, Profile } from './types'

function profile(username: string): Profile {
  return {
    id: `id-${username}`,
    username,
    display_name: username,
    bio: '',
    avatar_url: '',
    cover_image_url: '',
    website: '',
    github: '',
    social_links: [],
    skills: [],
    tools: [],
    certifications: [],
    followers_count: 0,
    following_count: 0,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  }
}

function notification(
  id: string,
  type: NotificationType,
  options: {
    actor?: string
    postId?: string | null
    commentId?: string | null
    read?: boolean
    createdAt?: string
  } = {},
): Notification {
  return {
    id,
    type,
    post_id: 'postId' in options ? (options.postId ?? null) : 'post-1',
    comment_id: options.commentId ?? null,
    read_at: options.read ? '2026-01-02T00:00:00.000Z' : null,
    created_at: options.createdAt ?? '2026-01-03T00:00:00.000Z',
    actor: profile(options.actor ?? 'amin'),
  }
}

describe('matchesFilter', () => {
  it('keeps everything under الكل', () => {
    for (const type of ['like', 'comment', 'follow', 'mention', 'reply'] as const) {
      expect(matchesFilter(notification('n', type), 'all')).toBe(true)
    }
  })

  it('groups mentions with replies', () => {
    expect(matchesFilter(notification('n', 'mention'), 'mentions')).toBe(true)
    expect(matchesFilter(notification('n', 'reply'), 'mentions')).toBe(true)
    expect(matchesFilter(notification('n', 'comment'), 'mentions')).toBe(false)
  })

  it('separates follows and likes', () => {
    expect(matchesFilter(notification('n', 'follow'), 'follows')).toBe(true)
    expect(matchesFilter(notification('n', 'follow'), 'likes')).toBe(false)
    expect(matchesFilter(notification('n', 'like'), 'likes')).toBe(true)
    expect(matchesFilter(notification('n', 'like'), 'follows')).toBe(false)
  })
})

describe('groupNotifications', () => {
  it('leaves other notifications as single rows', () => {
    const entries = groupNotifications([
      notification('a', 'comment'),
      notification('b', 'follow'),
      notification('c', 'mention'),
    ])

    expect(entries.map((entry) => entry.kind)).toEqual([
      'single',
      'single',
      'single',
    ])
    expect(entries).toHaveLength(3)
  })

  it('collapses likes on the same post into one entry', () => {
    const entries = groupNotifications([
      notification('l1', 'like', { actor: 'amin', postId: 'post-9' }),
      notification('c1', 'comment', { actor: 'khalid', postId: 'post-1' }),
      notification('l2', 'like', { actor: 'khalid', postId: 'post-9' }),
      notification('l3', 'like', { actor: 'sara', postId: 'post-9' }),
    ])

    expect(entries).toHaveLength(2)
    const [likes, comment] = entries

    expect(likes.kind).toBe('likes')
    if (likes.kind !== 'likes') throw new Error('expected a likes group')
    expect(likes.postId).toBe('post-9')
    expect(likes.actors.map((actor) => actor.username)).toEqual([
      'amin',
      'khalid',
      'sara',
    ])
    expect(likes.notifications.map((item) => item.id)).toEqual(['l1', 'l2', 'l3'])
    expect(likes.unread).toBe(true)

    expect(comment.kind).toBe('single')
  })

  it('keeps likes on different posts apart', () => {
    const entries = groupNotifications([
      notification('a', 'like', { postId: 'post-1' }),
      notification('b', 'like', { postId: 'post-2' }),
    ])

    expect(entries).toHaveLength(2)
    expect(entries.map((entry) => entry.kind)).toEqual(['single', 'single'])
  })

  it('treats a group as read only when every like is read', () => {
    const entries = groupNotifications([
      notification('a', 'like', { read: true }),
      notification('b', 'like', { read: true }),
    ])

    const group = entries[0]
    if (group.kind !== 'likes') throw new Error('expected a likes group')
    expect(group.unread).toBe(false)
  })

  it('keeps the newest like as the group timestamp', () => {
    const entries = groupNotifications([
      notification('a', 'like', { createdAt: '2026-02-01T00:00:00.000Z' }),
      notification('b', 'like', { createdAt: '2026-01-01T00:00:00.000Z' }),
    ])

    const group = entries[0]
    if (group.kind !== 'likes') throw new Error('expected a likes group')
    expect(group.createdAt).toBe('2026-02-01T00:00:00.000Z')
  })
})

describe('likesSummary', () => {
  it('uses the Arabic plural forms', () => {
    expect(likesSummary(1)).toBe('أعجب بمنشورك')
    expect(likesSummary(2)).toBe('شخصان أعجبا بمنشورك')
    expect(likesSummary(3)).toBe('3 أشخاص أعجبوا بمنشورك')
    expect(likesSummary(10)).toBe('10 أشخاص أعجبوا بمنشورك')
    expect(likesSummary(11)).toBe('11 شخصًا أعجبوا بمنشورك')
  })
})

describe('notificationHref', () => {
  it('links follows to the profile', () => {
    expect(notificationHref(notification('n', 'follow', { postId: null }))).toBe(
      '/u/amin',
    )
  })

  it('links replies and comment mentions to the comments anchor', () => {
    expect(notificationHref(notification('n', 'reply'))).toBe('/p/post-1#comments')
    expect(
      notificationHref(notification('n', 'mention', { commentId: 'c1' })),
    ).toBe('/p/post-1#comments')
  })

  it('links like and follow-free mentions to the post', () => {
    expect(notificationHref(notification('n', 'like'))).toBe('/p/post-1')
    expect(notificationHref(notification('n', 'mention'))).toBe('/p/post-1')
  })
})
