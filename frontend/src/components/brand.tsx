import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

export function Brand({
  to = '/',
  className,
  variant = 'full',
}: {
  to?: string
  className?: string
  variant?: 'full' | 'compact'
}) {
  return (
    <Link
      to={to}
      aria-label="بوتد — الصفحة الرئيسية"
      className={cn('group inline-flex items-center', className)}
    >
      <span className="flex flex-col items-start leading-none">
        <img
          src="/pootd-wordmark.png"
          alt="بوتد"
          width={240}
          height={56}
          className="h-7 w-auto transition-transform duration-200 group-hover:scale-[1.03] dark:invert"
        />
        {variant === 'full' ? (
          <span className="mt-1 text-[11px] font-medium text-muted-foreground">
            مجتمع الأمن السيبراني
          </span>
        ) : null}
      </span>
    </Link>
  )
}
