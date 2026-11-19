import { Suspense } from 'react'
import {
  DiscoverCircleIcon,
  Home03Icon,
  PencilEdit02Icon,
  UserIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { Brand } from '@/components/brand'
import { MobileNav } from '@/components/layout/mobile-nav'
import { NotificationBell } from '@/components/layout/notification-bell'
import { UserMenu } from '@/components/layout/user-menu'
import { FollowStep } from '@/components/onboarding/follow-step'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/hooks/use-auth'
import { useRealtimeSync } from '@/hooks/use-realtime'
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

const currentYear = new Date().getFullYear()

function HeaderLink({
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
          'inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium transition-colors',
          isActive
            ? 'bg-secondary text-foreground'
            : 'text-muted-foreground hover:text-foreground',
        )
      }
    >
      {icon}
      <span>{children}</span>
    </NavLink>
  )
}

function DesktopHeader() {
  const { user, profile, loading } = useAuth()

  return (
    <header className="sticky top-0 z-30 hidden border-b border-border/80 bg-background/80 backdrop-blur-xl lg:block">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-4 px-6">
        <div className="flex items-center gap-7">
          <Brand />
          <nav className="flex items-center gap-1" aria-label="التنقل الرئيسي"> {/**DON'T CHANGE IT */}
            <HeaderLink to="/" end icon={<HugeiconsIcon icon={Home03Icon} className="size-4" />}>
              الرئيسية
            </HeaderLink>
            <HeaderLink to="/explore" icon={<HugeiconsIcon icon={DiscoverCircleIcon} className="size-4" />}>
              استكشف
            </HeaderLink>
            {user && profile ? (
              <HeaderLink
                to={`/u/${profile.username}`}
                icon={<HugeiconsIcon icon={UserIcon} className="size-4" />}
              >
                ملفي
              </HeaderLink>
            ) : null}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <NotificationBell />
          {loading ? (
            <>
              <Skeleton className="h-9 w-32 rounded-lg" />
              <Skeleton className="size-9 rounded-full" />
            </>
          ) : user ? (
            <>
              <Button asChild size="sm" className="h-10 rounded-full px-5">
                <Link to="/#compose">
                  <HugeiconsIcon icon={PencilEdit02Icon} />
                  أنشئ منشور
                </Link>
              </Button>
              <UserMenu compact />
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/login">تسجيل الدخول</Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/signup">إنشاء حساب</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

function MobileHeader() {
  const { user, loading } = useAuth()

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/80 bg-background/80 px-4 backdrop-blur-xl lg:hidden">
      <Brand variant="compact" />
      <div className="flex items-center gap-1.5">
        <ThemeToggle />
        <NotificationBell />
        {loading ? (
          <Skeleton className="size-9 rounded-full" />
        ) : user ? (
          <UserMenu compact />
        ) : (
          <Button asChild size="sm" variant="outline">
            <Link to="/login">دخول</Link>
          </Button>
        )}
      </div>
    </header>
  )
}

function PageFallback() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-40 rounded-lg" />
      <Skeleton className="h-36 w-full rounded-xl" />
      <Skeleton className="h-40 w-full rounded-xl" />
      <Skeleton className="h-40 w-full rounded-xl" />
    </div>
  )
}

export function AppShell() {
  useRealtimeSync()

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <DesktopHeader />
      <MobileHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-28 pt-4 sm:px-6 sm:pt-8 lg:pb-12">
        <Suspense fallback={<PageFallback />}>
          <Outlet />
        </Suspense>
      </main>
      <footer className="mx-auto hidden w-full max-w-2xl items-center justify-between border-t border-border px-6 py-6 text-xs text-muted-foreground lg:flex">
        <span>© {currentYear} بوتد</span>
        <span>مساحة عربية للأمن السيبراني</span>
      </footer>
      <MobileNav />
      <FollowStep />
    </div>
  )
}
