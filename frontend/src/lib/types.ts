export type SortOption = 'new' | 'top'

export interface Profile {
  id: string
  username: string
  display_name: string
  bio: string
  avatar_url: string
  cover_image_url: string
  website: string
  github: string
  created_at: string
  updated_at: string
}

export interface Post {
  id: string
  author_id: string
  content: string
  tags: string[]
  like_count: number
  comment_count: number
  created_at: string
  updated_at: string
}

export interface PostWithAuthor extends Post {
  author: Profile
}

export interface Comment {
  id: string
  post_id: string
  author_id: string
  content: string
  created_at: string
}

export interface CommentWithAuthor extends Comment {
  author: Profile
}

export interface TrendingTag {
  tag: string
  post_count: number
}

export interface ProfileStats {
  posts: number
  likes: number
  comments: number
}

export interface ProfileUpdate {
  username: string
  display_name: string
  bio: string
  avatar_url: string
  cover_image_url: string
  website: string
  github: string
}
