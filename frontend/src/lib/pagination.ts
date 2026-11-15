import type { InfiniteData } from '@tanstack/react-query'
import type { Page } from './types'

/**
 * Turns the pages of an infinite query into one flat list so pages and
 * components can keep working with plain arrays.
 */
export function flattenPages<T>(
  data: InfiniteData<Page<T>> | undefined,
): T[] | undefined {
  return data?.pages.flatMap((page) => page.items)
}
