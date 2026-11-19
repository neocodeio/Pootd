import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { InfiniteData, QueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/use-auth'
import { queryKeys } from '@/lib/query-keys'
import { supabase } from '@/lib/supabase'
import type { Page, PostWithAuthor } from '@/lib/types'

type PostsData = InfiniteData<Page<PostWithAuthor>>

interface PostCountsRow {
  id: string
  author_id: string
  like_count: number
  comment_count: number
}

interface LikeRow {
  post_id: string
}

interface FollowRow {
  follower_id: string
  following_id: string
}

/**
 * Keys whose cached posts carry `like_count`/`comment_count`. The feed, profile
 * lists and search all read the same rows, so one post update has to touch
 * every copy of it.
 */
const POST_LIST_KEYS = [
  ['feed'],
  ['user-posts'],
  ['liked-posts'],
  ['bookmarked-posts'],
] as const

/**
 * Realtime topics must be unique: React StrictMode mounts effects twice in
 * development, and two channels with the same topic would double every event.
 */
let channelSeq = 0

function withCounts(post: PostWithAuthor, counts: PostCountsRow): PostWithAuthor {
  if (
    post.like_count === counts.like_count &&
    post.comment_count === counts.comment_count
  ) {
    return post
  }

  return {
    ...post,
    like_count: counts.like_count,
    comment_count: counts.comment_count,
  }
}

function patchPostsData(
  data: PostsData | undefined,
  counts: PostCountsRow,
): PostsData | undefined {
  if (!data) return data

  let changed = false
  const pages = data.pages.map((page) => {
    let pageChanged = false
    const items = page.items.map((post) => {
      if (post.id !== counts.id) return post
      const next = withCounts(post, counts)
      if (next !== post) pageChanged = true
      return next
    })

    if (!pageChanged) return page
    changed = true
    return { ...page, items }
  })

  return changed ? { ...data, pages } : data
}

/**
 * The like and comment counters are maintained by database triggers, so the
 * updated post row is the authoritative value — no local +/- guessing.
 */
function applyPostCounts(queryClient: QueryClient, counts: PostCountsRow): void {
  let changed = false

  for (const queryKey of POST_LIST_KEYS) {
    queryClient.setQueriesData<PostsData>({ queryKey }, (data) => {
      const next = patchPostsData(data, counts)
      if (next !== data) changed = true
      return next
    })
  }

  queryClient.setQueriesData<PostsData>(
    { queryKey: ['search', 'posts'] },
    (data) => {
      const next = patchPostsData(data, counts)
      if (next !== data) changed = true
      return next
    },
  )

  const postKey = queryKeys.post(counts.id)
  const cachedPost = queryClient.getQueryData<PostWithAuthor | null>(postKey)
  if (cachedPost && cachedPost.id === counts.id) {
    const next = withCounts(cachedPost, counts)
    if (next !== cachedPost) {
      queryClient.setQueryData(postKey, next)
      changed = true
    }
  }

  // The likes/comments counts on a profile come from a separate query.
  if (changed) {
    queryClient.invalidateQueries({
      queryKey: queryKeys.profileStats(counts.author_id),
    })
  }
}

/**
 * Keeps this tab in step when the signed-in user likes from another tab or
 * device. Counts themselves arrive through `applyPostCounts`.
 */
function applyOwnLike(
  queryClient: QueryClient,
  userId: string,
  postId: string,
  liked: boolean,
): void {
  queryClient.setQueriesData<string[]>(
    { queryKey: ['liked-ids', userId] },
    (ids) => {
      if (!ids) return ids
      const has = ids.includes(postId)
      if (has === liked) return ids
      return liked ? [...ids, postId] : ids.filter((id) => id !== postId)
    },
  )

  const likedKey = queryKeys.postLiked(userId, postId)
  const cached = queryClient.getQueryData<boolean>(likedKey)
  if (cached !== undefined && cached !== liked) {
    queryClient.setQueryData(likedKey, liked)
  }

  queryClient.invalidateQueries({ queryKey: ['liked-posts', userId] })
  queryClient.invalidateQueries({ queryKey: queryKeys.likedPostsCount(userId) })
  queryClient.invalidateQueries({ queryKey: queryKeys.profileStats(userId) })
}

/**
 * Delete events carry no columns beyond the primary key while RLS is on, so a
 * removed like cannot be matched to a post on the client. Re-reading the
 * signed-in user's like state is cheap and always correct.
 */
function refreshOwnLikes(queryClient: QueryClient, userId: string): void {
  queryClient.invalidateQueries({ queryKey: ['liked-ids', userId] })
  queryClient.invalidateQueries({ queryKey: ['post-liked', userId] })
  queryClient.invalidateQueries({ queryKey: ['liked-posts', userId] })
  queryClient.invalidateQueries({ queryKey: queryKeys.likedPostsCount(userId) })
  queryClient.invalidateQueries({ queryKey: queryKeys.profileStats(userId) })
}

function refreshNotifications(queryClient: QueryClient): void {
  queryClient.invalidateQueries({ queryKey: ['notifications'] })
  queryClient.invalidateQueries({ queryKey: ['notifications-unread'] })
}

/**
 * Realtime does not replay changes while the socket is down, so after a
 * reconnect — and whenever the tab becomes visible again — the caches are
 * refreshed once from PostgREST. A missed event is then a delay, not a bug.
 */
function resyncQueries(queryClient: QueryClient): void {
  const keys = [
    ['feed'],
    ['post'],
    ['comments'],
    ['user-posts'],
    ['liked-posts'],
    ['bookmarked-posts'],
    ['liked-ids'],
    ['post-liked'],
    ['notifications'],
    ['notifications-unread'],
    ['follows'],
    ['profile'],
    ['profile-stats'],
    ['top-profiles'],
    ['trending-tags'],
    ['search'],
  ]

  for (const queryKey of keys) {
    queryClient.invalidateQueries({ queryKey })
  }
}

/**
 * Subscribes once for the whole app shell: live like/comment counters on every
 * cached post, the signed-in user's own like state, and their notifications.
 */
export function useRealtimeSync(): void {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const userId = user?.id ?? null

  useEffect(() => {
    const topic = `pootd-live:${userId ?? 'anon'}:${++channelSeq}`
    let joined = false
    let notificationTimer: number | undefined
    let likeTimer: number | undefined
    let followsTimer: number | undefined

    // Marking all notifications read emits one update per row and a like
    // changes its post and the notification together; coalesce the bursts.
    const scheduleNotificationRefresh = () => {
      window.clearTimeout(notificationTimer)
      notificationTimer = window.setTimeout(
        () => refreshNotifications(queryClient),
        150,
      )
    }

    // Follow lists are small; a burst of follows collapses into one refetch.
    // The key is invalidated by prefix because the open profile can belong to
    // anyone, and its follower/following numbers must move too — not only the
    // signed-in user's own lists.
    const scheduleFollowsRefresh = () => {
      window.clearTimeout(followsTimer)
      followsTimer = window.setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['follows'] })
        // The numbers on a profile come from its own row now, so the open
        // profile must refetch as well — including when a third person
        // followed the profile the viewer is reading.
        queryClient.invalidateQueries({ queryKey: ['profile'] })
        queryClient.invalidateQueries({ queryKey: ['top-profiles'] })
      }, 150)
    }

    const scheduleOwnLikeRefresh = () => {
      if (!userId) return
      window.clearTimeout(likeTimer)
      likeTimer = window.setTimeout(
        () => refreshOwnLikes(queryClient, userId),
        250,
      )
    }

    let channel = supabase
      .channel(topic)
      .on<PostCountsRow>(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'posts' },
        (payload) => {
          const row = payload.new
          if (!row?.id || !row.author_id) return
          applyPostCounts(queryClient, row)

          // A like or comment on my own post can also remove a notification
          // (unliking, deleting a comment), which delete events cannot carry.
          if (userId && row.author_id === userId) {
            scheduleNotificationRefresh()
          }
        },
      )

    if (userId) {
      channel = channel
        .on<LikeRow>(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'likes',
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            const postId = payload.new?.post_id
            if (postId) applyOwnLike(queryClient, userId, postId, true)
          },
        )
        // Unfiltered on purpose: RLS strips delete payloads down to the key,
        // so a `user_id` filter would never match a removed like.
        .on<{ id: string }>(
          'postgres_changes',
          { event: 'DELETE', schema: 'public', table: 'likes' },
          () => scheduleOwnLikeRefresh(),
        )
        .on<{ id: string }>(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `recipient_id=eq.${userId}`,
          },
          () => scheduleNotificationRefresh(),
        )
        // Unfiltered on purpose: any follow can change the numbers of the
        // profile currently on screen, including a third person following a
        // profile the viewer is reading. The `follows` read policy is open to
        // signed-in users, which is also what lets these events through RLS.
        // Deletes carry no old columns beyond the key, so filtering them
        // client-side is not possible anyway.
        .on<FollowRow>(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'follows' },
          () => scheduleFollowsRefresh(),
        )
    }

    channel.subscribe((status) => {
      if (status !== 'SUBSCRIBED') return
      if (joined) resyncQueries(queryClient)
      joined = true
    })

    const onVisible = () => {
      if (document.visibilityState === 'visible') resyncQueries(queryClient)
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      window.clearTimeout(notificationTimer)
      window.clearTimeout(likeTimer)
      window.clearTimeout(followsTimer)
      document.removeEventListener('visibilitychange', onVisible)
      void supabase.removeChannel(channel)
    }
  }, [queryClient, userId])
}

/**
 * Live comments for one post. The subscription is per post so the app does not
 * receive (or authorize) comment traffic for posts nobody is reading.
 */
export function useRealtimeComments(postId: string): void {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!postId) return

    const topic = `pootd-comments:${postId}:${++channelSeq}`
    let refreshTimer: number | undefined

    // Deleting a post cascades its comments; collapse the burst into one fetch.
    const scheduleRefresh = () => {
      window.clearTimeout(refreshTimer)
      refreshTimer = window.setTimeout(
        () =>
          queryClient.invalidateQueries({ queryKey: queryKeys.comments(postId) }),
        120,
      )
    }

    const channel = supabase
      .channel(topic)
      .on<{ id: string }>(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'comments',
          filter: `post_id=eq.${postId}`,
        },
        () => scheduleRefresh(),
      )
      .on<{ id: string }>(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'comments',
          filter: `post_id=eq.${postId}`,
        },
        () => scheduleRefresh(),
      )
      // Deletes cannot be filtered (the old row only carries its key), so any
      // removed comment refreshes the open thread once.
      .on<{ id: string }>(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'comments' },
        () => scheduleRefresh(),
      )
      .subscribe()

    return () => {
      window.clearTimeout(refreshTimer)
      void supabase.removeChannel(channel)
    }
  }, [postId, queryClient])
}
