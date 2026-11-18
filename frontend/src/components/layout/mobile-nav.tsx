import {
  DiscoverCircleIcon,
  Home03Icon,
  Login01Icon,
  PlusSignIcon,
  Search01Icon,
  UserIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { NavLink } from 'react-router-dom'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/hooks/use-auth'
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

function MobileNavLink({
  to,
  icon,
  children,
  end = false,
}: {
  to: string
  icon: ReactNode
  children: ReactNode
  end?: boolean
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'flex flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium transition-colors',
          isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
        )
      }
    >
      {icon}
      <span>{children}</span>
    </NavLink>
  )
}

export function MobileNav() {
  const { user, profile, loading } = useAuth()

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/90 backdrop-blur-xl lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="التنقل السفلي"
    >
      <div className="mx-auto grid max-w-md grid-cols-5">
        <MobileNavLink to="/" end icon={<HugeiconsIcon icon={Home03Icon} className="size-5" />}>
          الرئيسية
        </MobileNavLink>
        <MobileNavLink to="/explore" icon={<HugeiconsIcon icon={DiscoverCircleIcon} className="size-5" />}>
          استكشف
        </MobileNavLink>
        <NavLink
          to={user ? '/#compose' : '/login'}
          className="flex flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium text-foreground"
        >
          <span className="flex size-9 items-center justify-center rounded-lg bg-foreground text-background">
            <HugeiconsIcon icon={PlusSignIcon} className="size-5" />
          </span>
          <span>أنشئ</span>
        </NavLink>
        <MobileNavLink to="/search" icon={<HugeiconsIcon icon={Search01Icon} className="size-5" />}>
          بحث
        </MobileNavLink>
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-1 py-2">
            <Skeleton className="size-5 rounded-full" />
            <Skeleton className="h-2.5 w-10 rounded-full" />
          </div>
        ) : user ? (
          <MobileNavLink
            to={profile ? `/u/${profile.username}` : '/settings'}
            icon={<HugeiconsIcon icon={UserIcon} className="size-5" />}
          >
            حسابي
          </MobileNavLink>
        ) : (
          <MobileNavLink to="/login" icon={<HugeiconsIcon icon={Login01Icon} className="size-5" />}>
            دخول
          </MobileNavLink>
        )}
      </div>
    </nav>
  )
}
