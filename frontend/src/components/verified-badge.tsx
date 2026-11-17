import { CheckmarkBadge02Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

/**
 * The verified seal: the icon's first path is the badge silhouette, the second
 * is the tick. The silhouette is filled with `--tag` blue and keeps its stroke
 * so the wavy points stay round; the tick is drawn again on top in
 * `--verified-check` white so it reads as a cut-out.
 *
 * Hovering shows the Saudi-accent tooltip; screen readers get `حساب موثّق`.
 */
const [SEAL_PATH] = CheckmarkBadge02Icon
const CHECK_PATH = CheckmarkBadge02Icon.slice(1)

export function VerifiedBadge({ className }: { className?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          role="img"
          aria-label="حساب موثّق"
          className={cn(
            'relative inline-flex size-4 shrink-0 items-center justify-center text-tag',
            className,
          )}
        >
          <HugeiconsIcon
            icon={[SEAL_PATH]}
            aria-hidden="true"
            className="size-full"
            fill="currentColor"
            strokeWidth={1.5}
          />
          <HugeiconsIcon
            icon={CHECK_PATH}
            aria-hidden="true"
            className="absolute inset-0 size-full text-verified-check"
            strokeWidth={2.5}
          />
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={2}>
        هالحساب موثّق
      </TooltipContent>
    </Tooltip>
  )
}
