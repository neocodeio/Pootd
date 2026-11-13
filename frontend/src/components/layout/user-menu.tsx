import { useQueryClient } from '@tanstack/react-query'
import { LogOut, Settings, UserRound } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { UserAvatar } from '@/components/user-avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

export function UserMenu({ compact = false }: { compact?: boolean }) {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  if (!user) return null

  const profilePath = profile ? `/u/${profile.username}` : '/settings'

  async function handleSignOut() {
    const { error } = await supabase.auth.signOut()
    if (error) {
      toast.error(error.message)
      return
    }
    queryClient.clear()
    toast.success('تم تسجيل الخروج')
    navigate('/')
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex items-center gap-2 rounded-full p-1 text-start transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            !compact && 'w-full',
          )}
          aria-label="فتح قائمة الحساب"
        >
          <UserAvatar profile={profile} name={user.email} />
          {!compact ? (
            <span className="min-w-0 flex-1">
              <span dir="auto" className="block truncate text-sm font-medium">
                {profile?.display_name ?? 'عضو'}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                <span dir="ltr">@{profile?.username ?? '…'}</span>
              </span>
            </span>
          ) : null}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="bottom" className="w-64 rounded-lg p-1">
        <DropdownMenuLabel className="flex flex-col gap-1 px-2 py-2">
          <span dir="auto" className="truncate text-sm font-semibold text-foreground">
            {profile?.display_name ?? 'عضو'}
          </span>
          {profile ? (
            <span className="truncate text-xs font-normal text-muted-foreground">
              <span dir="ltr">@{profile.username}</span>
            </span>
          ) : null}
          <span className="truncate text-xs font-normal text-muted-foreground">
            {user.email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="rounded-md px-2 py-2">
          <Link to={profilePath}>
            <UserRound />
            ملفي الشخصي
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="rounded-md px-2 py-2">
          <Link to="/settings">
            <Settings />
            الإعدادات
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          className="rounded-md px-2 py-2"
          onSelect={() => void handleSignOut()}
        >
          <LogOut />
          تسجيل الخروج
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
