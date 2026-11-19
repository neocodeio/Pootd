import { useState } from 'react'
import { Loading03Icon, UserBlock01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { UserAvatar } from '@/components/user-avatar'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useMutedProfiles } from '@/hooks/use-pootd'
import { useUnmuteProfile } from '@/hooks/use-mutations'
import type { Profile } from '@/lib/types'

function MutedRow({ profile }: { profile: Profile }) {
  const unmute = useUnmuteProfile()
  const [pending, setPending] = useState(false)

  function handleUnmute() {
    setPending(true)
    unmute.mutate(profile.id, {
      onSuccess: () => toast.success(`تم إلغاء كتم @${profile.username}`),
      onError: (error) => toast.error(error.message),
      onSettled: () => setPending(false),
    })
  }

  return (
    <div className="flex items-center gap-3 p-3">
      <Link
        to={`/u/${profile.username}`}
        aria-label={`عرض ملف ${profile.display_name}`}
        className="shrink-0"
      >
        <UserAvatar profile={profile} className="size-9" />
      </Link>

      <div className="min-w-0 flex-1">
        <Link
          to={`/u/${profile.username}`}
          dir="auto"
          className="block truncate text-sm font-medium transition-colors hover:underline"
        >
          {profile.display_name}
        </Link>
        <span
          dir="ltr"
          className="block truncate text-start text-xs text-muted-foreground"
        >
          @{profile.username}
        </span>
      </div>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleUnmute}
        disabled={pending || unmute.isPending}
        className="shrink-0 rounded-full text-xs"
      >
        {pending || unmute.isPending ? (
          <HugeiconsIcon icon={Loading03Icon} className="animate-spin" />
        ) : null}
        إلغاء الكتم
      </Button>
    </div>
  )
}

/**
 * Private mute list. Mutes are one-way preferences, so this only ever shows the
 * owner's own rows — the muted member is never told anything.
 */
export function MutedAccounts() {
  const { data, isLoading } = useMutedProfiles()
  const profiles = data ?? []

  return (
    <section className="border-t border-border p-4 sm:p-5">
      <h2 className="text-sm font-semibold">الحسابات المكتومة</h2>
      <p className="mt-1 text-xs leading-6 text-muted-foreground">
        الكتم خاص: صاحب الحساب ما يعرف، ومنشوراته ما تظهر لك في الرئيسية واستكشف
        والإشعارات.
      </p>

      {isLoading ? (
        <div className="mt-4 space-y-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="flex items-center gap-3">
              <Skeleton className="size-9 shrink-0 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ))}
        </div>
      ) : profiles.length === 0 ? (
        <p className="mt-4 flex items-center gap-2 rounded-xl border border-dashed border-border px-3 py-3 text-xs text-muted-foreground">
          <HugeiconsIcon icon={UserBlock01Icon} className="size-4 shrink-0" />
          ما كتمت أحد. تلقى خيار «كتم» في قائمة المنشور.
        </p>
      ) : (
        <div className="mt-4 divide-y divide-border overflow-hidden rounded-xl border border-border">
          {profiles.map((profile) => (
            <MutedRow key={profile.id} profile={profile} />
          ))}
        </div>
      )}
    </section>
  )
}
