import { useQuery } from '@tanstack/react-query'
import {
  getBookmarkedPostIds,
  getBookmarkedPosts,
  getComments,
  getFeed,
  getLikedPostIds,
  getLikedPosts,
  getPost,
  getProfileByUsername,
  getProfileStats,
  getTrendingTags,
  getUserPosts,
  isPostLiked,
  searchPosts,
  searchProfiles,
} from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'
import type { SortOption } from '@/lib/types'
import { useAuth } from './use-auth'

export function useFeed(tag: string | undefined, sort: SortOption) {
  return useQuery({
    queryKey: queryKeys.feed(tag, sort),
    queryFn: () => getFeed({ tag, sort }),
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
  return useQuery({
    queryKey: queryKeys.comments(postId),
    queryFn: () => getComments(postId),
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
  return useQuery({
    queryKey: queryKeys.userPosts(userId ?? ''),
    queryFn: () => getUserPosts(userId ?? ''),
    enabled: Boolean(userId),
    staleTime: 30_000,
  })
}

export function useLikedPosts(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.likedPosts(userId ?? ''),
    queryFn: () => getLikedPosts(userId ?? ''),
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

export function useTrendingTags() {
  return useQuery({
    queryKey: queryKeys.trendingTags(),
    queryFn: () => getTrendingTags(8),
    staleTime: 60_000,
  })
}

export function useSearchPosts(query: string) {
  return useQuery({
    queryKey: queryKeys.searchPosts(query),
    queryFn: () => searchPosts(query, 20),
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
  return useQuery({
    queryKey: queryKeys.bookmarkedPosts(userId ?? ''),
    queryFn: () => getBookmarkedPosts(userId ?? '', 30),
    enabled: Boolean(userId),
    staleTime: 30_000,
  })
}
