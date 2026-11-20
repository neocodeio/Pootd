import type { PostWithAuthor, SortOption } from './types'

/**
 * PostgREST carries the following feed's author list in the request URL as an
 * `in.()` literal, so a long follow list is split into chunks and merged here
 * instead of risking an oversized URL (Supabase rejects those outright).
 */
export const AUTHOR_ID_CHUNK = 120

/** Splits ids into request-sized groups, preserving order. */
export function chunkIds(ids: string[], size = AUTHOR_ID_CHUNK): string[][] {
  const step = Math.max(1, Math.floor(size))
  const chunks: string[][] = []
  for (let index = 0; index < ids.length; index += step) {
    chunks.push(ids.slice(index, index + step))
  }
  return chunks
}

function timeOf(value: string): number {
  const time = new Date(value).getTime()
  return Number.isNaN(time) ? 0 : time
}

/** Descending, matching the SQL order each chunk was fetched with. */
function comparePosts(a: PostWithAuthor, b: PostWithAuthor, sort: SortOption): number {
  if (sort === 'top') {
    const byLikes = (b.like_count ?? 0) - (a.like_count ?? 0)
    if (byLikes !== 0) return byLikes
  }

  const byTime = timeOf(b.created_at) - timeOf(a.created_at)
  if (byTime !== 0) return byTime

  if (a.id === b.id) return 0
  return a.id < b.id ? 1 : -1
}

/**
 * The rows of several chunk queries are one page: de-duplicated and sorted as
 * if a single query had returned them. Taking `limit + 1` per chunk is enough
 * to reconstruct the true top `limit + 1` rows of the union.
 */
export function mergeFeedRows(
  rows: PostWithAuthor[],
  sort: SortOption = 'new',
): PostWithAuthor[] {
  const byId = new Map<string, PostWithAuthor>()
  for (const row of rows) {
    if (!byId.has(row.id)) byId.set(row.id, row)
  }

  return [...byId.values()].sort((a, b) => comparePosts(a, b, sort))
}
