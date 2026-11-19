import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import {
  getBookmarkedPostIds,
  getBookmarkedPosts,
  getBookmarkedPostsCount,
  getComments,
  getFeed,
  getFollowState,
  getFollows,
  getLikedPostIds,
  getLikedPosts,
  getLikedPostsCount,
  getNotifications,
  getPost,
  getProfileByUsername,
  getProfileStats,
  getTopProfiles,
  getTrendingTags,
  getUnreadNotificationCount,
  getUserPosts,
  isPostLiked,
  searchPosts,
  searchProfiles,
} from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'
import type { Cursor, SortOption } from '@/lib/types'
import { useAuth } from './use-auth'

export function useFeed(tag: string | undefined, sort: SortOption) {
  return useInfiniteQuery({
    queryKey: queryKeys.feed(tag, sort),
    queryFn: ({ pageParam }) => getFeed({ tag, sort, cursor: pageParam }),
    initialPageParam: null as Cursor | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 30_000,
  })
}

export function usePost(postId: string) {
  return useQuery({
    queryKey: queryKeys.post(postId),
    queryFn: () => getPost(postId),
    staleTime: 30_000,
  })
}

export function useComments(postId: string) {
  return useInfiniteQuery({
    queryKey: queryKeys.comments(postId),
    queryFn: ({ pageParam }) => getComments(postId, { cursor: pageParam }),
    initialPageParam: null as Cursor | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 15_000,
  })
}

export function useLikedPostIds(postIds: string[]) {
  const { user } = useAuth()
  const idsKey = [...postIds].sort().join(',')

  return useQuery({
    queryKey: queryKeys.likedIds(user?.id ?? 'anon', idsKey),
    queryFn: () => getLikedPostIds(postIds, user?.id ?? ''),
    enabled: Boolean(user) && postIds.length > 0,
    staleTime: 30_000,
  })
}

export function usePostLiked(postId: string) {
  const { user } = useAuth()

  return useQuery({
    queryKey: queryKeys.postLiked(user?.id ?? 'anon', postId),
    queryFn: () => isPostLiked(postId, user?.id ?? ''),
    enabled: Boolean(user),
    staleTime: 30_000,
  })
}

export function useUserPosts(userId: string | undefined) {
  return useInfiniteQuery({
    queryKey: queryKeys.userPosts(userId ?? ''),
    queryFn: ({ pageParam }) => getUserPosts(userId ?? '', { cursor: pageParam }),
    initialPageParam: null as Cursor | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: Boolean(userId),
    staleTime: 30_000,
  })
}

export function useLikedPosts(userId: string | undefined) {
  return useInfiniteQuery({
    queryKey: queryKeys.likedPosts(userId ?? ''),
    queryFn: ({ pageParam }) => getLikedPosts(userId ?? '', { cursor: pageParam }),
    initialPageParam: null as Cursor | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: Boolean(userId),
    staleTime: 30_000,
  })
}

export function useLikedPostsCount(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.likedPostsCount(userId ?? ''),
    queryFn: () => getLikedPostsCount(userId ?? ''),
    enabled: Boolean(userId),
    staleTime: 30_000,
  })
}

export function useProfile(username: string | undefined) {
  return useQuery({
    queryKey: queryKeys.profile(username ?? ''),
    queryFn: () => getProfileByUsername(username ?? ''),
    enabled: Boolean(username),
    staleTime: 30_000,
  })
}

export function useProfileStats(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.profileStats(userId ?? ''),
    queryFn: () => getProfileStats(userId ?? ''),
    enabled: Boolean(userId),
    staleTime: 30_000,
  })
}

export function useTopProfiles(limit = 5) {
  const { user } = useAuth()

  return useQuery({
    queryKey: queryKeys.topProfiles(user?.id ?? 'anon', limit),
    queryFn: () => getTopProfiles(limit, user?.id),
    staleTime: 60_000,
  })
}

export function useFollows(
  userId: string | undefined,
  kind: 'followers' | 'following',
  enabled = true,
) {
  return useInfiniteQuery({
    queryKey: queryKeys.follows(userId ?? '', kind),
    queryFn: ({ pageParam }) => getFollows(userId ?? '', kind, { cursor: pageParam }),
    initialPageParam: null as Cursor | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    // The list is only fetched when its dialog opens; profile counts come from
    // the profile row.
    enabled: Boolean(userId) && enabled,
    staleTime: 30_000,
  })
}

export function useFollowState(userId: string | undefined, targetUserId: string) {
  return useQuery({
    queryKey: queryKeys.followsState(userId ?? '', targetUserId),
    queryFn: () => getFollowState(userId ?? '', targetUserId),
    enabled: Boolean(userId) && Boolean(targetUserId),
    staleTime: 30_000,
  })
}

export function useTrendingTags() {
  return useQuery({
    queryKey: queryKeys.trendingTags(),
    queryFn: () => getTrendingTags(8),
    staleTime: 60_000,
  })
}

export function useSearchPosts(query: string) {
  return useInfiniteQuery({
    queryKey: queryKeys.searchPosts(query),
    queryFn: ({ pageParam }) => searchPosts(query, { cursor: pageParam }),
    initialPageParam: null as Cursor | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: query.trim().length >= 2,
    staleTime: 30_000,
  })
}

export function useSearchProfiles(query: string) {
  return useQuery({
    queryKey: queryKeys.searchProfiles(query),
    queryFn: () => searchProfiles(query, 12),
    enabled: query.trim().length >= 2,
    staleTime: 60_000,
  })
}

export function useBookmarkedPostIds(postIds: string[]) {
  const { user } = useAuth()
  const idsKey = [...postIds].sort().join(',')

  return useQuery({
    queryKey: queryKeys.bookmarkedIds(user?.id ?? 'anon', idsKey),
    queryFn: () => getBookmarkedPostIds(user?.id ?? '', postIds),
    enabled: Boolean(user) && postIds.length > 0,
    staleTime: 30_000,
  })
}

export function useBookmarkedPosts(userId: string | undefined) {
  return useInfiniteQuery({
    queryKey: queryKeys.bookmarkedPosts(userId ?? ''),
    queryFn: ({ pageParam }) => getBookmarkedPosts(userId ?? '', { cursor: pageParam }),
    initialPageParam: null as Cursor | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: Boolean(userId),
    staleTime: 30_000,
  })
}

export function useBookmarkedPostsCount(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.bookmarkedPostsCount(userId ?? ''),
    queryFn: () => getBookmarkedPostsCount(userId ?? ''),
    enabled: Boolean(userId),
    staleTime: 30_000,
  })
}

export function useNotifications() {
  const { user } = useAuth()

  return useInfiniteQuery({
    queryKey: queryKeys.notifications(user?.id ?? 'anon'),
    queryFn: ({ pageParam }) => getNotifications(user?.id ?? '', { cursor: pageParam }),
    initialPageParam: null as Cursor | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: Boolean(user),
    staleTime: 15_000,
  })
}

export function useUnreadNotificationCount() {
  const { user } = useAuth()

  return useQuery({
    queryKey: queryKeys.notificationsUnread(user?.id ?? 'anon'),
    queryFn: () => getUnreadNotificationCount(user?.id ?? ''),
    enabled: Boolean(user),
    staleTime: 15_000,
    refetchInterval: 60_000,
  })
}
