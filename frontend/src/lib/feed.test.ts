import { describe, expect, it } from 'vitest'
import { chunkIds, mergeFeedRows } from './feed'
import type { PostWithAuthor, Profile } from './types'

function profile(username: string): Profile {
  return {
    id: `author-${username}`,
    username,
    display_name: username,
    bio: '',
    avatar_url: '',
    cover_image_url: '',
    website: '',
    github: '',
    social_links: [],
    followers_count: 0,
    following_count: 0,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  }
}

function post(id: string, createdAt: string, likeCount = 0): PostWithAuthor {
  return {
    id,
    author_id: 'author-amin',
    content: id,
    tags: [],
    image_url: null,
    like_count: likeCount,
    comment_count: 0,
    created_at: createdAt,
    updated_at: createdAt,
    author: profile('amin'),
  }
}

describe('chunkIds', () => {
  it('keeps short lists in a single chunk', () => {
    expect(chunkIds(['a', 'b'], 10)).toEqual([['a', 'b']])
  })

  it('splits long lists without losing or reordering ids', () => {
    const ids = Array.from({ length: 7 }, (_, index) => `id-${index}`)
    const chunks = chunkIds(ids, 3)

    expect(chunks.map((chunk) => chunk.length)).toEqual([3, 3, 1])
    expect(chunks.flat()).toEqual(ids)
  })

  it('returns no chunks for an empty list', () => {
    expect(chunkIds([])).toEqual([])
  })

  it('never produces a zero-step loop', () => {
    expect(chunkIds(['a', 'b'], 0)).toEqual([['a'], ['b']])
  })
})

describe('mergeFeedRows', () => {
  it('orders newest first and breaks ties by id', () => {
    const rows = [
      post('b', '2026-11-01T10:00:00.000Z'),
      post('c', '2026-11-02T10:00:00.000Z'),
      post('a', '2026-11-01T10:00:00.000Z'),
    ]

    expect(mergeFeedRows(rows).map((row) => row.id)).toEqual(['c', 'b', 'a'])
  })

  it('orders by likes first when sorting by top', () => {
    const rows = [
      post('newest', '2026-11-02T10:00:00.000Z', 1),
      post('liked', '2026-11-01T10:00:00.000Z', 9),
      post('middle', '2026-11-03T10:00:00.000Z', 4),
    ]

    expect(mergeFeedRows(rows, 'top').map((row) => row.id)).toEqual([
      'liked',
      'middle',
      'newest',
    ])
  })

  it('keeps one copy of a post seen in two chunks', () => {
    const rows = [
      post('x', '2026-11-01T10:00:00.000Z'),
      post('x', '2026-11-01T10:00:00.000Z'),
    ]

    expect(mergeFeedRows(rows)).toHaveLength(1)
  })
})
