export type SortOption = 'new' | 'top'

/**
 * Keyset cursor. `like_count` is only present for the "top" ordering and `id`
 * is the tie-breaker so pages never overlap or skip rows.
 */
export interface Cursor {
  created_at: string
  id: string
  like_count?: number
}

export interface Page<T> {
  items: T[]
  nextCursor: Cursor | null
}

export interface ReportInput {
  postId?: string
  commentId?: string
  reason: ReportReason
  details?: string
}

export type ReportReason = 'spam' | 'harassment' | 'malicious_link' | 'other'

export type NotificationType = 'like' | 'comment' | 'follow' | 'mention' | 'reply'

export interface Notification {
  id: string
  type: NotificationType
  post_id: string | null
  comment_id: string | null
  read_at: string | null
  created_at: string
  actor: Profile
}

export type SocialPlatform =
  | 'x'
  | 'github'
  | 'linkedin'
  | 'instagram'
  | 'telegram'
  | 'youtube'

export interface SocialLink {
  platform: SocialPlatform
  url: string
}

/** One award on the profile: a certification, a course or an achievement. */
export interface Certification {
  title: string
  issuer: string
  /** Four-digit year, or an empty string when the member left it out. */
  year: string
  /** Optional https link to the certificate itself. */
  url: string
}

export interface Profile {
  id: string
  username: string
  display_name: string
  bio: string
  avatar_url: string
  cover_image_url: string
  website: string
  github: string
  social_links: SocialLink[]
  /** Expertise labels shown on the profile card (at most 12). */
  skills: string[]
  /** Tools and platforms the member works with (at most 12). */
  tools: string[]
  /** Certifications and achievements, in the order the member saved them. */
  certifications: Certification[]
  /** Maintained by the `follows` triggers — never derived from a fetched list. */
  followers_count: number
  following_count: number
  created_at: string
  updated_at: string
}

export interface Post {
  id: string
  author_id: string
  content: string
  tags: string[]
  image_url: string | null
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
  parent_id: string | null
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
  social_links: SocialLink[]
  skills: string[]
  tools: string[]
  certifications: Certification[]
}
