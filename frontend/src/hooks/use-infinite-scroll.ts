import { useEffect, useRef, useState } from 'react'

/**
 * Loads the next page when a sentinel element scrolls into view.
 *
 * The observer is rebuilt whenever a page settles, because an intersection is
 * only reported when it *changes*: a short list that stays inside the viewport
 * would otherwise stall after one page. While a page is in flight the observer
 * is detached, which also keeps a failing request from retrying itself.
 */
export function useInfiniteScroll({
  hasMore,
  isLoading,
  hasError = false,
  onLoadMore,
  rootMargin = '600px',
}: {
  hasMore: boolean
  isLoading: boolean
  hasError?: boolean
  onLoadMore: () => void
  rootMargin?: string
}) {
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const [supported] = useState(() => typeof IntersectionObserver !== 'undefined')
  const onLoadMoreRef = useRef(onLoadMore)

  // Keep the latest callback without rebuilding the observer on every render.
  useEffect(() => {
    onLoadMoreRef.current = onLoadMore
  }, [onLoadMore])

  useEffect(() => {
    if (!supported || !hasMore || isLoading || hasError) return

    const node = sentinelRef.current
    if (!node) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          onLoadMoreRef.current()
        }
      },
      { rootMargin },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [supported, hasMore, isLoading, hasError, rootMargin])

  return { sentinelRef, autoLoad: supported && !hasError, supported }
}
