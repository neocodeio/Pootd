import type { SortOption } from './types'

export const queryKeys = {
  feed: (tag: string | undefined, sort: SortOption) => ['feed', tag ?? '', sort] as const,
  post: (postId: string) => ['post', postId] as const,
  comments: (postId: string) => ['comments', postId] as const,
  likedIds: (userId: string, idsKey: string) => ['liked-ids', userId, idsKey] as const,
  postLiked: (userId: string, postId: string) => ['post-liked', userId, postId] as const,
  userPosts: (userId: string) => ['user-posts', userId] as const,
  likedPosts: (userId: string) => ['liked-posts', userId] as const,
  likedPostsCount: (userId: string) => ['liked-posts-count', userId] as const,
  profile: (username: string) => ['profile', username] as const,
  profileStats: (userId: string) => ['profile-stats', userId] as const,
  topProfiles: (viewerId: string, limit: number) => ['top-profiles', viewerId, limit] as const,
  trendingTags: () => ['trending-tags'] as const,
  searchPosts: (query: string) => ['search', 'posts', query] as const,
  searchProfiles: (query: string) => ['search', 'profiles', query] as const,
  bookmarkedIds: (userId: string, idsKey: string) => ['bookmarked-ids', userId, idsKey] as const,
  bookmarkedPosts: (userId: string) => ['bookmarked-posts', userId] as const,
  bookmarkedPostsCount: (userId: string) => ['bookmarked-posts-count', userId] as const,
  notifications: (userId: string, mutedKey = '') => ['notifications', userId, mutedKey] as const,
  notificationsUnread: (userId: string, mutedKey = '') =>
    ['notifications-unread', userId, mutedKey] as const,
  mutedIds: (userId: string) => ['mutes', userId] as const,
  mutedProfiles: (userId: string) => ['mutes', userId, 'profiles'] as const,
  follows: (userId: string, kind: 'followers' | 'following') => ['follows', userId, kind] as const,
  followsState: (userId: string, targetUserId: string) => ['follows', userId, 'state', targetUserId] as const,
}

