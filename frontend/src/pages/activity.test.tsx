import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { PostWithAuthor, Profile } from '@/lib/types'
import { ActivityPage } from './activity'

const fixtures = vi.hoisted(() => ({
  profile: null as unknown,
  stats: null as unknown,
  posts: [] as unknown[],
  following: [] as unknown[],
  followingCount: 0,
  followingError: null as unknown,
  muted: [] as string[],
}))

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    user: { id: 'me' },
    profile: fixtures.profile,
    loading: false,
  }),
}))

vi.mock('@/hooks/use-pootd', () => {
  const infinite = (items: unknown[]) => ({
    pages: [{ items, nextCursor: null }],
    pageParams: [null],
  })

  return {
    useProfileStats: () => ({
      data: fixtures.stats ?? undefined,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    }),
    useUserPosts: () => ({
      data: infinite(fixtures.posts),
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    }),
    useFollowingFeed: () => ({
      data: infinite(fixtures.following),
      isLoading: false,
      isPreparing: false,
      followingError: fixtures.followingError,
      error: null,
      followingCount: fixtures.followingCount,
      refetch: vi.fn(),
    }),
    useMutedIds: () => ({ data: fixtures.muted }),
  }
})

function profile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: 'me',
    username: 'amin',
    display_name: 'أمين',
    bio: '',
    avatar_url: '',
    cover_image_url: '',
    website: '',
    github: '',
    social_links: [],
    skills: [],
    tools: [],
    certifications: [],
    followers_count: 45,
    following_count: 3,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function post(overrides: Partial<PostWithAuthor> = {}): PostWithAuthor {
  return {
    id: 'post-1',
    author_id: 'khalid',
    content: 'نص المنشور',
    tags: [],
    image_url: null,
    like_count: 3,
    comment_count: 1,
    created_at: '2026-11-20T10:00:00.000Z',
    updated_at: '2026-11-20T10:00:00.000Z',
    author: profile({ id: 'khalid', username: 'khalid', display_name: 'خالد' }),
    ...overrides,
  }
}

function renderPage() {
  return render(
    <MemoryRouter>
      <ActivityPage />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  fixtures.profile = profile()
  fixtures.stats = { posts: 48, likes: 340, comments: 21 }
  fixtures.posts = [
    post({ id: 'mine-1', author_id: 'me', content: 'أول مساهمة' }),
    post({ id: 'mine-2', author_id: 'me', content: 'ثاني مساهمة' }),
  ]
  fixtures.following = [
    post({ id: 'own-in-feed', author_id: 'me', content: 'منشوري أنا' }),
    post({ id: 'muted', author_id: 'muted', content: 'منشور مكتوم' }),
    post({
      id: 'khalid-1',
      content: 'منشور خالد',
      author: profile({ id: 'khalid', username: 'khalid', display_name: 'خالد' }),
    }),
    post({
      id: 'noura-1',
      author_id: 'noura',
      content: 'منشور نورة',
      author: profile({ id: 'noura', username: 'noura', display_name: 'نورة' }),
    }),
  ]
  fixtures.followingCount = 3
  fixtures.followingError = null
  fixtures.muted = ['muted']
})

afterEach(cleanup)

describe('ActivityPage', () => {
  it('renders the statistics, the followed posts and the contributions', () => {
    renderPage()

    expect(
      screen.getByRole('heading', { name: 'لوحة النشاط' }),
    ).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'إحصائياتك' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'من متابعاتك' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'مساهماتك' })).toBeTruthy()

    // Row counters: posts, likes, comments, followers.
    expect(screen.getByText('48')).toBeTruthy()
    expect(screen.getByText('340')).toBeTruthy()
    expect(screen.getByText('21')).toBeTruthy()
    expect(screen.getByText('45')).toBeTruthy()

    expect(screen.getByText('منشور خالد')).toBeTruthy()
    expect(screen.getByText('منشور نورة')).toBeTruthy()
    expect(screen.getByText('أول مساهمة')).toBeTruthy()
    expect(screen.getByText('ثاني مساهمة')).toBeTruthy()

    // Your own post in the follows feed and a muted author never show up.
    expect(screen.queryByText('منشوري أنا')).toBeNull()
    expect(screen.queryByText('منشور مكتوم')).toBeNull()
  })

  it('links each row to its post', () => {
    renderPage()

    expect(
      screen.getByText('منشور خالد').closest('a')?.getAttribute('href'),
    ).toBe('/p/khalid-1')
    expect(
      screen.getByText('أول مساهمة').closest('a')?.getAttribute('href'),
    ).toBe('/p/mine-1')
  })

  it('asks the member to follow people when the list is empty', () => {
    fixtures.following = []
    fixtures.followingCount = 0
    renderPage()

    expect(screen.getByText('لم تتابع أحدًا بعد.')).toBeTruthy()
    expect(
      screen.getAllByRole('link', { name: 'استكشف الأعضاء' }),
    ).toHaveLength(2)
  })

  it('keeps the empty follows feed distinct from following nobody', () => {
    fixtures.following = []
    fixtures.followingCount = 2
    renderPage()

    expect(screen.getByText('ما فيه منشورات من متابعاتك بعد.')).toBeTruthy()
    expect(screen.queryByText('لم تتابع أحدًا بعد.')).toBeNull()
  })

  it('offers the composer when the member has no posts yet', () => {
    fixtures.posts = []
    renderPage()

    expect(screen.getByText('ما نشرت شي بعد.')).toBeTruthy()
    expect(
      screen.getByRole('link', { name: 'اكتب منشورًا' }).getAttribute('href'),
    ).toBe('/#compose')
  })
})
