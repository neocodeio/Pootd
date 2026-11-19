import { UserAvatar } from '@/components/user-avatar'
import { VerifiedBadge } from '@/components/verified-badge'
import { isVerified } from '@/lib/verified'
import type { Profile } from '@/lib/types'

/**
 * Inline suggestion list for `@mentions`. Rendered in the composer's flow so
 * it is never clipped by the card and never covers the publish row.
 */
export function MentionSuggestions({
  open,
  options,
  activeIndex,
  listboxId,
  onHover,
  onSelect,
}: {
  open: boolean
  options: Profile[]
  activeIndex: number
  listboxId: string
  onHover: (index: number) => void
  onSelect: (profile: Profile) => void
}) {
  if (!open || options.length === 0) return null

  return (
    <div
      id={listboxId}
      role="listbox"
      aria-label="اقتراحات الإشارة"
      className="mt-2 max-h-56 overflow-y-auto overflow-x-hidden rounded-xl border border-border bg-card"
    >
      {options.map((profile, index) => (
        <button
          key={profile.id}
          id={`${listboxId}-${index}`}
          type="button"
          role="option"
          aria-selected={index === activeIndex}
          // Keep the textarea focused, so the caret survives the click.
          onMouseDown={(event) => event.preventDefault()}
          onMouseEnter={() => onHover(index)}
          onClick={() => onSelect(profile)}
          className={`flex w-full items-center gap-2.5 px-3 py-2 text-start transition-colors ${
            index === activeIndex ? 'bg-secondary' : 'hover:bg-secondary/50'
          }`}
        >
          <UserAvatar profile={profile} className="size-7 shrink-0" />
          <span className="min-w-0 flex-1">
            <span className="flex min-w-0 items-center gap-1">
              <span
                dir="auto"
                className="truncate text-sm font-medium text-foreground"
              >
                {profile.display_name}
              </span>
              {isVerified(profile.username) ? (
                <VerifiedBadge className="size-3.5" />
              ) : null}
            </span>
            <span
              dir="ltr"
              className="block truncate text-start text-xs text-muted-foreground"
            >
              @{profile.username}
            </span>
          </span>
        </button>
      ))}
    </div>
  )
}
