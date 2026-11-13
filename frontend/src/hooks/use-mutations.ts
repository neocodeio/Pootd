import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  createComment,
  createPost,
  deleteComment,
  deleteCoverFile,
  deletePost,
  toggleBookmark,
  toggleLike,
  updatePost,
  updateProfile,
  uploadAvatar,
  uploadCover,
} from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'
import type { PostWithAuthor, ProfileUpdate } from '@/lib/types'
import { useAuth } from './use-auth'

function bumpLikeCount(
  posts: PostWithAuthor[] | undefined,
  postId: string,
  delta: number,
): PostWithAuthor[] | undefined {
  return posts?.map((post) =>
    post.id === postId
      ? { ...post, like_count: Math.max(0, post.like_count + delta) }
      : post,
  )
}

export function useToggleLike(postId: string) {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (currentlyLiked: boolean) => {
      if (!user) throw new Error('سجّل دخولك أولًا للإعجاب بالمنشورات.')
      return toggleLike(postId, user.id, currentlyLiked)
    },
    onMutate: async (currentlyLiked) => {
      if (!user) return
      const delta = currentlyLiked ? -1 : 1

      await Promise.all([
        queryClient.cancelQueries({ queryKey: ['feed'] }),
        queryClient.cancelQueries({ queryKey: ['user-posts'] }),
        queryClient.cancelQueries({ queryKey: ['liked-posts'] }),
        queryClient.cancelQueries({ queryKey: ['liked-ids', user.id] }),
        queryClient.cancelQueries({ queryKey: queryKeys.post(postId) }),
        queryClient.cancelQueries({ queryKey: queryKeys.postLiked(user.id, postId) }),
      ])

      queryClient.setQueriesData<PostWithAuthor[]>({ queryKey: ['feed'] }, (posts) =>
        bumpLikeCount(posts, postId, delta),
      )
      queryClient.setQueriesData<PostWithAuthor[]>({ queryKey: ['user-posts'] }, (posts) =>
        bumpLikeCount(posts, postId, delta),
      )
      queryClient.setQueriesData<PostWithAuthor[]>({ queryKey: ['liked-posts'] }, (posts) =>
        bumpLikeCount(posts, postId, delta),
      )

      const post = queryClient.getQueryData<PostWithAuthor | null>(queryKeys.post(postId))
      if (post) {
        queryClient.setQueryData(queryKeys.post(postId), {
          ...post,
          like_count: Math.max(0, post.like_count + delta),
        })
      }

      queryClient.setQueriesData<string[]>({ queryKey: ['liked-ids', user.id] }, (ids) => {
        const next = new Set(ids ?? [])
        if (currentlyLiked) next.delete(postId)
        else next.add(postId)
        return Array.from(next)
      })

      queryClient.setQueryData<boolean>(
        queryKeys.postLiked(user.id, postId),
        !currentlyLiked,
      )
    },
    onError: () => {
      if (!user) return
      queryClient.invalidateQueries({ queryKey: ['feed'] })
      queryClient.invalidateQueries({ queryKey: ['user-posts'] })
      queryClient.invalidateQueries({ queryKey: ['liked-posts'] })
      queryClient.invalidateQueries({ queryKey: ['liked-ids', user.id] })
      queryClient.invalidateQueries({ queryKey: queryKeys.post(postId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.postLiked(user.id, postId) })
    },
    onSettled: () => {
      if (!user) return
      queryClient.invalidateQueries({ queryKey: queryKeys.post(postId) })
      queryClient.invalidateQueries({ queryKey: ['liked-ids', user.id] })
      queryClient.invalidateQueries({ queryKey: queryKeys.postLiked(user.id, postId) })
      queryClient.invalidateQueries({ queryKey: ['liked-posts'] })
      queryClient.invalidateQueries({ queryKey: ['profile-stats'] })
    },
  })
}

export function useCreatePost() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ content, tags }: { content: string; tags: string[] }) => {
      if (!user) throw new Error('سجّل دخولك أولًا للنشر.')
      return createPost(user.id, content, tags)
    },
    onSuccess: () => {
      if (!user) return
      queryClient.invalidateQueries({ queryKey: ['feed'] })
      queryClient.invalidateQueries({ queryKey: queryKeys.userPosts(user.id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.profileStats(user.id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.trendingTags() })
    },
  })
}

export function useDeletePost() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (postId: string) => deletePost(postId),
    onSuccess: (_data, postId) => {
      queryClient.removeQueries({ queryKey: queryKeys.post(postId) })
      queryClient.removeQueries({ queryKey: queryKeys.comments(postId) })
      queryClient.invalidateQueries({ queryKey: ['feed'] })
      queryClient.invalidateQueries({ queryKey: ['user-posts'] })
      queryClient.invalidateQueries({ queryKey: ['profile-stats'] })
      queryClient.invalidateQueries({ queryKey: queryKeys.trendingTags() })
      if (user) {
        queryClient.invalidateQueries({ queryKey: queryKeys.likedPosts(user.id) })
      }
    },
  })
}

export function useCreateComment(postId: string) {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (content: string) => {
      if (!user) throw new Error('سجّل دخولك أولًا للتعليق.')
      return createComment(postId, user.id, content)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.comments(postId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.post(postId) })
      queryClient.invalidateQueries({ queryKey: ['feed'] })
      queryClient.invalidateQueries({ queryKey: ['user-posts'] })
      queryClient.invalidateQueries({ queryKey: ['liked-posts'] })
      queryClient.invalidateQueries({ queryKey: ['profile-stats'] })
    },
  })
}

export function useUpdatePost() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      postId,
      content,
      tags,
    }: {
      postId: string
      content: string
      tags: string[]
    }) => {
      if (!user) throw new Error('سجّل دخولك أولًا لتعديل منشوراتك.')
      return updatePost(postId, content, tags)
    },
    onSuccess: (post) => {
      queryClient.setQueryData(queryKeys.post(post.id), post)
      queryClient.invalidateQueries({ queryKey: ['feed'] })
      queryClient.invalidateQueries({ queryKey: ['user-posts'] })
      queryClient.invalidateQueries({ queryKey: ['liked-posts'] })
      queryClient.invalidateQueries({ queryKey: ['post'] })
      queryClient.invalidateQueries({ queryKey: ['comments'] })
      queryClient.invalidateQueries({ queryKey: ['search'] })
      queryClient.invalidateQueries({ queryKey: ['bookmarked-posts'] })
    },
  })
}

export function useToggleBookmark(postId: string) {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (bookmarked: boolean) => {
      if (!user) throw new Error('سجّل دخولك الأول لحفظ المنشورات.')
      return toggleBookmark(postId, user.id, bookmarked)
    },
    onSuccess: (_data, bookmarked) => {
      queryClient.invalidateQueries({ queryKey: ['bookmarked-ids'] })
      queryClient.invalidateQueries({ queryKey: ['bookmarked-posts'] })
      if (bookmarked) {
        toast.success('أزلنا المنشور من المحفوظات')
      } else {
        toast.success('حفظنا المنشور')
      }
    },
  })
}

export function useDeleteComment(postId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (commentId: string) => deleteComment(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.comments(postId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.post(postId) })
      queryClient.invalidateQueries({ queryKey: ['feed'] })
      queryClient.invalidateQueries({ queryKey: ['user-posts'] })
      queryClient.invalidateQueries({ queryKey: ['liked-posts'] })
      queryClient.invalidateQueries({ queryKey: ['profile-stats'] })
    },
  })
}

export function useUpdateProfile() {
  const { user, refreshProfile } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (patch: Partial<ProfileUpdate>) => {
      if (!user) throw new Error('سجّل دخولك أولًا لتعديل ملفك.')
      const profile = await updateProfile(user.id, patch)
      await refreshProfile()
      return profile
    },
    onSuccess: (profile) => {
      if (!user) return
      queryClient.setQueryData(queryKeys.profile(profile.username), profile)
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      queryClient.invalidateQueries({ queryKey: ['feed'] })
      queryClient.invalidateQueries({ queryKey: ['post'] })
      queryClient.invalidateQueries({ queryKey: ['comments'] })
      queryClient.invalidateQueries({ queryKey: ['user-posts'] })
      queryClient.invalidateQueries({ queryKey: ['liked-posts'] })
      queryClient.invalidateQueries({ queryKey: queryKeys.profileStats(user.id) })
    },
  })
}

export function useUpdateAvatar() {
  const { user, refreshProfile } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (file: File) => {
      if (!user) throw new Error('سجّل دخولك أولًا لتحديث صورتك.')
      const avatarUrl = await uploadAvatar(user.id, file)
      const profile = await updateProfile(user.id, { avatar_url: avatarUrl })
      await refreshProfile()
      return profile
    },
    onSuccess: (profile) => {
      queryClient.setQueryData(queryKeys.profile(profile.username), profile)
      queryClient.invalidateQueries({ queryKey: ['feed'] })
      queryClient.invalidateQueries({ queryKey: ['post'] })
      queryClient.invalidateQueries({ queryKey: ['comments'] })
      queryClient.invalidateQueries({ queryKey: ['user-posts'] })
      queryClient.invalidateQueries({ queryKey: ['liked-posts'] })
    },
  })
}

export function useUpdateCover() {
  const { user, refreshProfile } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (file: File) => {
      if (!user) throw new Error('سجّل دخولك أولًا لتحديث صورة الغلاف.')
      const coverUrl = await uploadCover(user.id, file)
      const profile = await updateProfile(user.id, { cover_image_url: coverUrl })
      await refreshProfile()
      return profile
    },
    onSuccess: (profile) => {
      queryClient.setQueryData(queryKeys.profile(profile.username), profile)
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      queryClient.invalidateQueries({ queryKey: ['feed'] })
      queryClient.invalidateQueries({ queryKey: ['post'] })
      queryClient.invalidateQueries({ queryKey: ['comments'] })
      queryClient.invalidateQueries({ queryKey: ['user-posts'] })
      queryClient.invalidateQueries({ queryKey: ['liked-posts'] })
    },
  })
}

export function useRemoveCover() {
  const { user, refreshProfile } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('سجّل دخولك أولًا لحذف صورة الغلاف.')
      const profile = await updateProfile(user.id, { cover_image_url: '' })

      try {
        await deleteCoverFile(user.id)
      } catch (error) {
        // The profile row is already cleared, so a leftover file is harmless.
        console.error(error)
      }

      await refreshProfile()
      return profile
    },
    onSuccess: (profile) => {
      queryClient.setQueryData(queryKeys.profile(profile.username), profile)
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      queryClient.invalidateQueries({ queryKey: ['feed'] })
      queryClient.invalidateQueries({ queryKey: ['post'] })
      queryClient.invalidateQueries({ queryKey: ['comments'] })
      queryClient.invalidateQueries({ queryKey: ['user-posts'] })
      queryClient.invalidateQueries({ queryKey: ['liked-posts'] })
    },
  })
}
