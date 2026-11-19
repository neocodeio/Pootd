import { ChevronLeftIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useTrendingTags } from '@/hooks/use-pootd'
import { postsLabel } from '@/lib/format'

/**
 * Trending hashtags as a ranked list, the way Explore surfaces what the
 * community is talking about right now.
 */
export function TrendingTags() {
  const { data, isLoading, error, refetch } = useTrendingTags()

  return (
    <section aria-labelledby="trending-tags-heading">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 id="trending-tags-heading" className="text-sm font-semibold">
          الرائج الآن
        </h2>
        <span className="text-xs text-muted-foreground">آخر 30 يومًا</span>
      </div>

      {error ? (
        <Card className="flex items-center justify-between gap-3 p-4">
          <p className="text-sm text-muted-foreground">
            تعذّر تحميل الوسوم الرائجة.
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => void refetch()}
          >
            حاول مرة ثانية
          </Button>
        </Card>
      ) : isLoading ? (
        <Card className="divide-y divide-border overflow-hidden">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="flex items-center gap-3 p-3.5 sm:px-5">
              <Skeleton className="h-3 w-4 rounded" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ))}
        </Card>
      ) : !data || data.length === 0 ? (
        <Card className="p-4">
          <p className="text-sm leading-7 text-muted-foreground">
            ما فيه وسوم رائجة بعد. الوسم يصير رائج لما يتكرر في منشورين أو أكثر.
          </p>
        </Card>
      ) : (
        <Card className="divide-y divide-border overflow-hidden">
          {data.map((tag, index) => (
            <Link
              key={tag.tag}
              to={`/tags/${tag.tag}`}
              className="flex items-center gap-3 p-3.5 transition-colors hover:bg-secondary/40 sm:px-5"
            >
              <span className="w-5 shrink-0 text-center text-xs font-medium text-muted-foreground/70 tabular-nums">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span
                  dir="ltr"
                  className="block truncate text-sm font-semibold text-tag"
                >
                  #{tag.tag}
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {postsLabel(tag.post_count)}
                </span>
              </span>
              <HugeiconsIcon
                icon={ChevronLeftIcon}
                className="size-3.5 shrink-0 text-muted-foreground/60"
                aria-hidden="true"
              />
            </Link>
          ))}
        </Card>
      )}
    </section>
  )
}
