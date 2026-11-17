import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useTrendingTags } from '@/hooks/use-pootd'
import { postsLabel } from '@/lib/format'

export function TrendingTags() {
  const { data, isLoading, error, refetch } = useTrendingTags()

  if (isLoading) {
    return (
      <div className="mt-3 flex flex-wrap gap-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-7 w-24 rounded-md" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">تعذّر تحميل الوسوم الرائجة.</p>
        <Button type="button" variant="ghost" size="sm" onClick={() => void refetch()}>
          حاول مرة ثانية
        </Button>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <p className="mt-3 text-sm text-muted-foreground">
        ما فيه وسوم رائجة بعد. الوسم يصير رائج لما يتكرر في منشورين أو أكثر.
      </p>
    )
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {data.map((tag) => (
        <Link
          key={tag.tag}
          to={`/tags/${tag.tag}`}
          className="inline-flex items-center gap-1.5 rounded-md bg-secondary px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <span dir="ltr">#{tag.tag}</span>
          <span className="tabular-nums">{postsLabel(tag.post_count)}</span>
        </Link>
      ))}
    </div>
  )
}
