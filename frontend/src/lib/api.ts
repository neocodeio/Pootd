import { supabase } from './supabase'
import { postImageExtension, validatePostImage } from './image'
import type {
  CommentWithAuthor,
  Cursor,
  Notification,
  Page,
  PostWithAuthor,
  Profile,
  ProfileStats,
  ProfileUpdate,
  ReportInput,
  SortOption,
  TrendingTag,
} from './types'
import { normalizeSearchTerm, normalizeTag, normalizeUsername } from './validation'

const PAGE_SIZE = 20
const COMMENT_PAGE_SIZE = 30
const NOTIFICATION_PAGE_SIZE = 20

function throwIfError(error: { message: string } | null): void {
  if (error) throw new Error(error.message)
}/** PostgREST filters are happier with a timezone marker than with `+00:00`. */
function toIso(value: string): string {
  return new Date(value).toISOString()
}

function cursorOf(row: { created_at: string; id: string; like_count?: number }): Cursor {
  return { created_at: row.created_at, id: row.id, like_count: row.like_count }
}

/**
 * Fetches one extra row so the caller knows whether another page exists
 * without a second round-trip.
 */
function toPage<T>(rows: T[], limit: number, cursor: (row: T) => Cursor): Page<T> {
  const items = rows.slice(0, limit)
  const last = items[items.length - 1]
  return {
    items,
    nextCursor: rows.length > limit && last ? cursor(last) : null,
  }
}

export async function getFeed(
  options: {
    tag?: string
    sort?: SortOption
    limit?: number
    cursor?: Cursor | null
  } = {},
): Promise<Page<PostWithAuthor>> {
  const limit = options.limit ?? PAGE_SIZE
  const cursor = options.cursor ?? null

  let query = supabase
    .from('posts')
    .select('*, author:profiles!posts_author_id_fkey(*)')
    .limit(limit + 1)

  if (options.tag) {
    query = query.contains('tags', [normalizeTag(options.tag)])
  }

  if (options.sort === 'top') {
    if (cursor) {
      const likeCount = cursor.like_count ?? 0
      const at = toIso(cursor.created_at)
      query = query.or(
        [
          `like_count.lt.${likeCount}`,
          `and(like_count.eq.${likeCount},created_at.lt.${at})`,
          `and(like_count.eq.${likeCount},created_at.eq.${at},id.lt.${cursor.id})`,
        ].join(','),
      )
    }
    query = query
      .order('like_count', { ascending: false })
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
  } else {
    if (cursor) {
      const at = toIso(cursor.created_at)
      query = query.or(
        `created_at.lt.${at},and(created_at.eq.${at},id.lt.${cursor.id})`,
      )
    }
    query = query
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
  }

  const { data, error } = await query
  throwIfError(error)
  return toPage((data ?? []) as unknown as PostWithAuthor[], limit, cursorOf)
}


export async function getPost(postId: string): Promise<PostWithAuthor | null> {
  const { data, error } = await supabase
    .from('posts')
    .select('*, author:profiles!posts_author_id_fkey(*)')
    .eq('id', postId)
    .maybeSingle()

  throwIfError(error)
  return (data as unknown as PostWithAuthor | null) ?? null
}

export async function getUserPosts(
  userId: string,
  options: { limit?: number; cursor?: Cursor | null } = {},
): Promise<Page<PostWithAuthor>> {
  const limit = options.limit ?? PAGE_SIZE
  const cursor = options.cursor ?? null

  let query = supabase
    .from('posts')
    .select('*, author:profiles!posts_author_id_fkey(*)')
    .eq('author_id', userId)
    .limit(limit + 1)

  if (cursor) {
    const at = toIso(cursor.created_at)
    query = query.or(`created_at.lt.${at},and(created_at.eq.${at},id.lt.${cursor.id})`)
  }

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })

  throwIfError(error)
  return toPage((data ?? []) as unknown as PostWithAuthor[], limit, cursorOf)
}

export async function getLikedPosts(
  userId: string,
  options: { limit?: number; cursor?: Cursor | null } = {},
): Promise<Page<PostWithAuthor>> {
  const limit = options.limit ?? PAGE_SIZE
  const cursor = options.cursor ?? null

  let query = supabase
    .from('likes')
    .select(
      'post_id, created_at, post:posts!likes_post_id_fkey(*, author:profiles!posts_author_id_fkey(*))',
    )
    .eq('user_id', userId)
    .limit(limit + 1)

  if (cursor) {
    const at = toIso(cursor.created_at)
    query = query.or(`created_at.lt.${at},and(created_at.eq.${at},post_id.lt.${cursor.id})`)
  }

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .order('post_id', { ascending: false })

  throwIfError(error)

  const rows = (data ?? []) as unknown as {
    post_id: string
    created_at: string
    post: PostWithAuthor | null
  }[]
  const page = rows.slice(0, limit)
  const last = page[page.length - 1]

  return {
    items: page
      .map((row) => row.post)
      .filter((post): post is PostWithAuthor => Boolean(post)),
    nextCursor:
      rows.length > limit && last
        ? { created_at: last.created_at, id: last.post_id }
        : null,
  }
}

export async function getLikedPostsCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('likes')
    .select('post_id', { count: 'exact', head: true })
    .eq('user_id', userId)

  throwIfError(error)
  return count ?? 0
}


export async function getLikedPostIds(
  postIds: string[],
  userId: string,
): Promise<string[]> {
  if (postIds.length === 0) return []

  const { data, error } = await supabase
    .from('likes')
    .select('post_id')
    .eq('user_id', userId)
    .in('post_id', postIds)

  throwIfError(error)
  return ((data ?? []) as { post_id: string }[]).map((row) => row.post_id)
}

export async function isPostLiked(postId: string, userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('likes')
    .select('post_id')
    .eq('post_id', postId)
    .eq('user_id', userId)
    .maybeSingle()

  throwIfError(error)
  return Boolean(data)
}

export async function toggleLike(
  postId: string,
  userId: string,
  currentlyLiked: boolean,
): Promise<void> {
  if (currentlyLiked) {
    const { error } = await supabase
      .from('likes')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', userId)
    throwIfError(error)
    return
  }

  const { error } = await supabase.from('likes').insert({
    post_id: postId,
    user_id: userId,
  })

  if (error && error.code !== '23505') throw new Error(error.message)
}

export async function createPost(
  userId: string,
  content: string,
  tags: string[],
  imageUrl = '',
): Promise<PostWithAuthor> {
  const { data, error } = await supabase
    .from('posts')
    .insert({
      author_id: userId,
      content: content.trim(),
      tags,
      ...(imageUrl ? { image_url: imageUrl } : {}),
    })
    .select('*, author:profiles!posts_author_id_fkey(*)')
    .single()

  throwIfError(error)
  return data as unknown as PostWithAuthor
}

export async function deletePost(postId: string, imageUrl = ''): Promise<void> {
  const { error } = await supabase.from('posts').delete().eq('id', postId)
  throwIfError(error)

  // The post row is gone, so a leftover object is harmless. Never turn a
  // storage hiccup into a failed delete from the user's point of view.
  if (imageUrl) {
    try {
      await deletePostImage(imageUrl)
    } catch (cleanupError) {
      console.error(cleanupError)
    }
  }
}

export async function updatePost(
  postId: string,
  content: string,
  tags: string[],
): Promise<PostWithAuthor> {
  const { data, error } = await supabase
    .from('posts')
    .update({ content: content.trim(), tags })
    .eq('id', postId)
    .select('*, author:profiles!posts_author_id_fkey(*)')
    .maybeSingle()

  throwIfError(error)
  if (!data) {
    throw new Error('ما قدرنا نعدّل المنشور. تأكد إنك صاحب المنشور.')
  }
  return data as unknown as PostWithAuthor
}

export async function searchPosts(
  query: string,
  options: { limit?: number; cursor?: Cursor | null } = {},
): Promise<Page<PostWithAuthor>> {
  const term = normalizeSearchTerm(query)
  if (term.length < 2) return { items: [], nextCursor: null }

  const limit = options.limit ?? PAGE_SIZE
  const cursor = options.cursor ?? null
  const matches = [`search_text.ilike.%${term}%`, `tags.cs.{${term}}`]

  let queryBuilder = supabase
    .from('posts')
    .select('*, author:profiles!posts_author_id_fkey(*)')
    .limit(limit + 1)

  if (cursor) {
    const at = toIso(cursor.created_at)
    // A single flat OR that combines each match with the cursor. Calling
    // `.or()` twice would send two `or` params and AND them at the top level.
    queryBuilder = queryBuilder.or(
      matches
        .flatMap((match) => [
          `and(${match},created_at.lt.${at})`,
          `and(${match},created_at.eq.${at},id.lt.${cursor.id})`,
        ])
        .join(','),
    )
  } else {
    queryBuilder = queryBuilder.or(matches.join(','))
  }

  const { data, error } = await queryBuilder
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })

  throwIfError(error)
  return toPage((data ?? []) as unknown as PostWithAuthor[], limit, cursorOf)
}

export async function searchProfiles(query: string, limit = 12): Promise<Profile[]> {
  const term = normalizeSearchTerm(query)
  if (term.length < 2) return []

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .ilike('search_text', `%${term}%`)
    .order('created_at', { ascending: false })
    .limit(limit)

  throwIfError(error)
  return (data ?? []) as Profile[]
}

/**
 * Most-followed members for the Explore leaderboard. The viewer is left out so
 * the list always has room for someone new.
 */
export async function getTopProfiles(
  limit = 5,
  viewerId?: string,
): Promise<Profile[]> {
  let query = supabase
    .from('profiles')
    .select('*')
    .order('followers_count', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(limit)

  if (viewerId) query = query.neq('id', viewerId)

  const { data, error } = await query
  throwIfError(error)
  return (data ?? []) as Profile[]
}

export async function getComments(
  postId: string,
  options: { limit?: number; cursor?: Cursor | null } = {},
): Promise<Page<CommentWithAuthor>> {
  const limit = options.limit ?? COMMENT_PAGE_SIZE
  const cursor = options.cursor ?? null

  let query = supabase
    .from('comments')
    .select('*, author:profiles!comments_author_id_fkey(*)')
    .eq('post_id', postId)
    .limit(limit + 1)

  if (cursor) {
    const at = toIso(cursor.created_at)
    query = query.or(`created_at.gt.${at},and(created_at.eq.${at},id.gt.${cursor.id})`)
  }

  const { data, error } = await query
    .order('created_at', { ascending: true })
    .order('id', { ascending: true })

  throwIfError(error)
  return toPage((data ?? []) as unknown as CommentWithAuthor[], limit, cursorOf)
}


export async function createComment(
  postId: string,
  userId: string,
  content: string,
  parentId?: string,
): Promise<CommentWithAuthor> {
  const { data, error } = await supabase
    .from('comments')
    .insert({
      post_id: postId,
      author_id: userId,
      content: content.trim(),
      ...(parentId ? { parent_id: parentId } : {}),
    })
    .select('*, author:profiles!comments_author_id_fkey(*)')
    .single()

  throwIfError(error)
  return data as unknown as CommentWithAuthor
}

export async function deleteComment(commentId: string): Promise<void> {
  const { error } = await supabase.from('comments').delete().eq('id', commentId)
  throwIfError(error)
}

export async function getProfileByUsername(username: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', normalizeUsername(username))
    .maybeSingle()

  throwIfError(error)
  return (data as Profile | null) ?? null
}

export async function getProfileById(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  throwIfError(error)
  return (data as Profile | null) ?? null
}

export async function getProfileStats(userId: string): Promise<ProfileStats> {
  const { data, error } = await supabase.rpc('get_profile_stats', {
    profile_id: userId,
  })

  throwIfError(error)
  const rows = (data ?? []) as ProfileStats[]
  const row = rows[0]
  return {
    posts: Number(row?.posts ?? 0),
    likes: Number(row?.likes ?? 0),
    comments: Number(row?.comments ?? 0),
  }
}

export async function getFollows(
  userId: string,
  kind: 'followers' | 'following',
  options: { limit?: number; cursor?: Cursor | null } = {},
): Promise<Page<Profile>> {
  const limit = options.limit ?? 30
  const cursor = options.cursor ?? null
  const isFollowers = kind === 'followers'
  // "Who follows X" filters the graph on `following_id`; the profile on the
  // other side of that edge is the follower. "Who X follows" is the reverse.
  const filterColumn = isFollowers ? 'following_id' : 'follower_id'
  const edgeColumn = isFollowers ? 'follower_id' : 'following_id'
  const relation = isFollowers
    ? 'profile:profiles!follows_follower_id_fkey(*)'
    : 'profile:profiles!follows_following_id_fkey(*)'

  let query = supabase
    .from('follows')
    .select(`created_at, ${edgeColumn}, ${relation}`)
    .eq(filterColumn, userId)
    .limit(limit + 1)

  if (cursor) {
    const at = toIso(cursor.created_at)
    query = query.or(
      `created_at.lt.${at},and(created_at.eq.${at},${edgeColumn}.lt.${cursor.id})`,
    )
  }

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .order(edgeColumn, { ascending: false })

  throwIfError(error)

  const rows = (data ?? []) as unknown as {
    created_at: string
    follower_id?: string
    following_id?: string
    profile: Profile | null
  }[]
  const page = rows.slice(0, limit)
  const last = page[page.length - 1]
  const lastEdgeId = last
    ? isFollowers
      ? last.follower_id
      : last.following_id
    : undefined

  return {
    items: page
      .map((row) => row.profile)
      .filter((profile): profile is Profile => Boolean(profile)),
    nextCursor:
      rows.length > limit && last && lastEdgeId
        ? { created_at: last.created_at, id: lastEdgeId }
        : null,
  }
}

export async function getFollowState(
  userId: string,
  targetUserId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('follower_id', userId)
    .eq('following_id', targetUserId)
    .maybeSingle()

  throwIfError(error)
  return Boolean(data)
}

export async function toggleFollow(
  userId: string,
  targetUserId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('follower_id', userId)
    .eq('following_id', targetUserId)
    .maybeSingle()

  if (error) throw new Error(error.message)

  if (data) {
    const { error: deleteError } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', userId)
      .eq('following_id', targetUserId)
    throwIfError(deleteError)
    return false
  }

  const { error: insertError } = await supabase.from('follows').insert({
    follower_id: userId,
    following_id: targetUserId,
  })

  if (insertError && insertError.code !== '23505') {
    throw new Error(insertError.message)
  }

  return true
}

export async function getTrendingTags(limit = 8): Promise<TrendingTag[]> {
  const { data, error } = await supabase.rpc('get_trending_tags', {
    tag_limit: limit,
  })

  throwIfError(error)
  return ((data ?? []) as TrendingTag[]).map((row) => ({
    tag: row.tag,
    post_count: Number(row.post_count),
  }))
}

export async function updateProfile(
  userId: string,
  patch: Partial<ProfileUpdate>,
): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', userId)
    .select('*')
    .single()

  throwIfError(error)
  return data as Profile
}

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const allowedTypes = ['image/png', 'image/jpeg', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    throw new Error('الملف لازم يكون PNG أو JPG أو WebP.')
  }
  if (file.size > 2 * 1024 * 1024) {
    throw new Error('حجم الصورة لازم يكون 2 ميجابايت أو أقل.')
  }

  const path = `${userId}/avatar`
  const { error } = await supabase.storage.from('avatars').upload(path, file, {
    upsert: true,
    contentType: file.type,
    cacheControl: '3600',
  })

  throwIfError(error)

  const { data } = supabase.storage.from('avatars').getPublicUrl(path)
  return `${data.publicUrl}?v=${Date.now()}`
}

export async function uploadCover(userId: string, file: File): Promise<string> {
  const allowedTypes = ['image/png', 'image/jpeg', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    throw new Error('الملف لازم يكون PNG أو JPG أو WebP.')
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('حجم صورة الغلاف لازم يكون 5 ميجابايت أو أقل.')
  }

  const path = `${userId}/cover`
  const { error } = await supabase.storage.from('covers').upload(path, file, {
    upsert: true,
    contentType: file.type,
    cacheControl: '3600',
  })

  throwIfError(error)

  const { data } = supabase.storage.from('covers').getPublicUrl(path)
  return `${data.publicUrl}?v=${Date.now()}`
}

export async function deleteCoverFile(userId: string): Promise<void> {
  const { error } = await supabase.storage.from('covers').remove([`${userId}/cover`])
  throwIfError(error)
}

export async function uploadPostImage(userId: string, file: File): Promise<string> {
  validatePostImage(file)

  const path = `${userId}/${crypto.randomUUID()}.${postImageExtension(file)}`
  const { error } = await supabase.storage.from('post-images').upload(path, file, {
    contentType: file.type,
    cacheControl: '3600',
  })

  throwIfError(error)

  const { data } = supabase.storage.from('post-images').getPublicUrl(path)
  return data.publicUrl
}

/**
 * Removes the storage object behind a post image. The URL is the only thing a
 * post row stores; a URL that does not belong to this bucket is left alone.
 */
export async function deletePostImage(imageUrl: string): Promise<void> {
  const marker = '/object/public/post-images/'
  const markerIndex = imageUrl.indexOf(marker)
  if (markerIndex === -1) return

  const path = decodeURIComponent(
    imageUrl.slice(markerIndex + marker.length).split('?')[0],
  )
  if (!path) return

  const { error } = await supabase.storage.from('post-images').remove([path])
  throwIfError(error)
}

export async function getBookmarkedPostIds(
  userId: string,
  postIds: string[],
): Promise<string[]> {
  if (!userId || postIds.length === 0) return []

  const { data, error } = await supabase
    .from('bookmarks')
    .select('post_id')
    .eq('user_id', userId)
    .in('post_id', postIds)

  throwIfError(error)
  return ((data ?? []) as { post_id: string }[]).map((row) => row.post_id)
}

export async function toggleBookmark(
  postId: string,
  userId: string,
  bookmarked: boolean,
): Promise<void> {
  if (bookmarked) {
    const { error } = await supabase
      .from('bookmarks')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', userId)
    throwIfError(error)
    return
  }

  const { error } = await supabase
    .from('bookmarks')
    .insert({ post_id: postId, user_id: userId })

  if (error && error.code !== '23505') throw new Error(error.message)
}

export async function getBookmarkedPosts(
  userId: string,
  options: { limit?: number; cursor?: Cursor | null } = {},
): Promise<Page<PostWithAuthor>> {
  if (!userId) return { items: [], nextCursor: null }

  const limit = options.limit ?? PAGE_SIZE
  const cursor = options.cursor ?? null

  let query = supabase
    .from('bookmarks')
    .select(
      'post_id, created_at, post:posts!bookmarks_post_id_fkey(*, author:profiles!posts_author_id_fkey(*))',
    )
    .eq('user_id', userId)
    .limit(limit + 1)

  if (cursor) {
    const at = toIso(cursor.created_at)
    query = query.or(`created_at.lt.${at},and(created_at.eq.${at},post_id.lt.${cursor.id})`)
  }

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .order('post_id', { ascending: false })

  throwIfError(error)

  const rows = (data ?? []) as unknown as {
    post_id: string
    created_at: string
    post: PostWithAuthor | null
  }[]
  const page = rows.slice(0, limit)
  const last = page[page.length - 1]

  return {
    items: page
      .map((row) => row.post)
      .filter((post): post is PostWithAuthor => Boolean(post)),
    nextCursor:
      rows.length > limit && last
        ? { created_at: last.created_at, id: last.post_id }
        : null,
  }
}

export async function getBookmarkedPostsCount(userId: string): Promise<number> {
  if (!userId) return 0

  const { count, error } = await supabase
    .from('bookmarks')
    .select('post_id', { count: 'exact', head: true })
    .eq('user_id', userId)

  throwIfError(error)
  return count ?? 0
}

export async function getNotifications(
  userId: string,
  options: { limit?: number; cursor?: Cursor | null } = {},
): Promise<Page<Notification>> {
  const limit = options.limit ?? NOTIFICATION_PAGE_SIZE
  const cursor = options.cursor ?? null

  let query = supabase
    .from('notifications')
    .select(
      'id, type, post_id, comment_id, read_at, created_at, actor:profiles!notifications_actor_id_fkey(*)',
    )
    .eq('recipient_id', userId)
    .limit(limit + 1)

  if (cursor) {
    const at = toIso(cursor.created_at)
    query = query.or(`created_at.lt.${at},and(created_at.eq.${at},id.lt.${cursor.id})`)
  }

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })

  throwIfError(error)
  return toPage((data ?? []) as unknown as Notification[], limit, cursorOf)
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  if (!userId) return 0

  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('recipient_id', userId)
    .is('read_at', null)

  throwIfError(error)
  return count ?? 0
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId)
    .is('read_at', null)

  throwIfError(error)
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('recipient_id', userId)
    .is('read_at', null)

  throwIfError(error)
}

export async function createReport(
  reporterId: string,
  input: ReportInput,
): Promise<void> {
  const { error } = await supabase.from('reports').insert({
    reporter_id: reporterId,
    post_id: input.postId ?? null,
    comment_id: input.commentId ?? null,
    reason: input.reason,
    details: input.details?.trim() ?? '',
  })

  if (error) {
    if (error.code === '23505') {
      throw new Error('أبلغت عن هذا المحتوى من قبل.')
    }
    throw new Error(error.message)
  }
}


export async function isUsernameAvailable(username: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('username', normalizeUsername(username))

  throwIfError(error)
  return (count ?? 0) === 0
}
