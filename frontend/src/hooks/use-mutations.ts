import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { InfiniteData } from '@tanstack/react-query'
import { toast } from 'sonner'
import { deleteAccount } from '@/lib/account-api'
import {
  createComment,
  createPost,
  createReport,
  deleteComment,
  deleteCoverFile,
  deletePost,
  deletePostImage,
  markAllNotificationsRead,
  markNotificationRead,
  toggleBookmark,
  toggleFollow,
  toggleLike,
  updatePost,
  updateProfile,
  uploadAvatar,
  uploadCover,
  uploadPostImage,
} from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'
import { supabase } from '@/lib/supabase'
import type { Page, PostWithAuthor, ProfileUpdate, ReportInput } from '@/lib/types'
import { useAuth } from './use-auth'

type PostsData = InfiniteData<Page<PostWithAuthor>>

function bumpLikeCount(
  data: PostsData | undefined,
  postId: string,
  delta: number,
): PostsData | undefined {
  if (!data) return data

  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      items: page.items.map((post) =>
        post.id === postId
          ? { ...post, like_count: Math.max(0, post.like_count + delta) }
          : post,
      ),
    })),
  }
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

      queryClient.setQueriesData<PostsData>({ queryKey: ['feed'] }, (data) =>
        bumpLikeCount(data, postId, delta),
      )
      queryClient.setQueriesData<PostsData>({ queryKey: ['user-posts'] }, (data) =>
        bumpLikeCount(data, postId, delta),
      )
      queryClient.setQueriesData<PostsData>({ queryKey: ['liked-posts'] }, (data) =>
        bumpLikeCount(data, postId, delta),
      )
      queryClient.setQueriesData<PostsData>({ queryKey: ['bookmarked-posts'] }, (data) =>
        bumpLikeCount(data, postId, delta),
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

export function useToggleFollow() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (targetUserId: string) => toggleFollow(user?.id ?? '', targetUserId),
    // The open profile's follower/following numbers live under the target's
    // key, so the whole `follows` prefix is invalidated — not just the
    // viewer's own lists. The counters themselves sit on the profile row, so
    // `profile` is refreshed too. `onSettled` also repairs state after a
    // failure.
    onSettled: () => {
      if (!user) return
      queryClient.invalidateQueries({ queryKey: ['follows'] })
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      queryClient.invalidateQueries({ queryKey: ['suggested-profiles'] })
    },
  })
}

export function useCreatePost() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      content,
      tags,
      file,
    }: {
      content: string
      tags: string[]
      file?: File | null
    }) => {
      if (!user) throw new Error('سجّل دخولك أولًا للنشر.')

      let imageUrl = ''
      if (file) imageUrl = await uploadPostImage(user.id, file)

      try {
        return await createPost(user.id, content, tags, imageUrl)
      } catch (error) {
        // The upload happened first; drop the orphan if the row never landed.
        if (imageUrl) {
          try {
            await deletePostImage(imageUrl)
          } catch (cleanupError) {
            console.error(cleanupError)
          }
        }
        throw error
      }
    },
    onSuccess: () => {
      if (!user) return
      queryClient.invalidateQueries({ queryKey: ['feed'] })
      queryClient.invalidateQueries({ queryKey: ['search'] })
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
    mutationFn: ({ postId, imageUrl }: { postId: string; imageUrl?: string }) =>
      deletePost(postId, imageUrl),
    onSuccess: (_data, { postId }) => {
      queryClient.removeQueries({ queryKey: queryKeys.post(postId) })
      queryClient.removeQueries({ queryKey: queryKeys.comments(postId) })
      queryClient.invalidateQueries({ queryKey: ['feed'] })
      queryClient.invalidateQueries({ queryKey: ['user-posts'] })
      queryClient.invalidateQueries({ queryKey: ['profile-stats'] })
      queryClient.invalidateQueries({ queryKey: ['search'] })
      queryClient.invalidateQueries({ queryKey: queryKeys.trendingTags() })
      // Deleting a post cascades the notifications that point at it.
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] })
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
    mutationFn: ({
      content,
      parentId,
    }: {
      content: string
      parentId?: string
    }) => {
      if (!user) throw new Error('سجّل دخولك أولًا للتعليق.')
      return createComment(postId, user.id, content, parentId)
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

export function useMarkNotificationRead() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (notificationId: string) => markNotificationRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      if (user) {
        queryClient.invalidateQueries({ queryKey: queryKeys.notificationsUnread(user.id) })
      }
    },
  })
}

export function useMarkAllNotificationsRead() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => {
      if (!user) throw new Error('سجّل دخولك أولًا.')
      return markAllNotificationsRead(user.id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      if (user) {
        queryClient.invalidateQueries({ queryKey: queryKeys.notificationsUnread(user.id) })
      }
    },
  })
}

export function useCreateReport() {
  const { user } = useAuth()

  return useMutation({
    mutationFn: (input: ReportInput) => {
      if (!user) throw new Error('سجّل دخولك أولًا للإبلاغ عن المحتوى.')
      return createReport(user.id, input)
    },
  })
}

export function useDeleteAccount() {
  const { session } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      if (!session) throw new Error('سجّل دخولك أولًا.')
      await deleteAccount(session.access_token)
      await supabase.auth.signOut()
      queryClient.clear()
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
